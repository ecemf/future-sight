import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import path, { join } from 'path';

import data from '../data/data.json';
import models from '../data/models.json';
import filterData from '../data/filter.json'
import regions from '../data/regions.json';
import dashboard from '../data/dashboards.json';
import allData from '../data/test-data.json';

import * as fs from 'fs';
import RedisClient from '../redis/RedisClient';
import IDataProxy from './IDataProxy';

export default class ExpressServer {
  private app: any;
  private readonly port: number;
  private readonly auth: any;
  private readonly clientPath: any;
  private readonly dbClient: RedisClient;
  private readonly dataProxy: IDataProxy;

  constructor(
    port,
    cookieKey,
    auth,
    clientPath,
    dbClient,
    dataProxy: IDataProxy
  ) {
    this.app = express();
    this.port = port;
    this.auth = auth;
    this.clientPath = clientPath;
    this.dbClient = dbClient;
    this.dataProxy = dataProxy;
    this.app.use(bodyParser.json({ limit: '50mb' }));
    this.app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
    if (auth) {
      this.app.use(this.auth);
    }
    this.app.use(cors());
    // Serve static resources from the "public" folder (ex: when there are images to display)
    this.app.use(express.static(join(__dirname, clientPath)));
    this.endpoints();
  }

  private endpoints = () => {
    this.app.get('/api/users/auth', (req, res) => {
      const options = {
        httpOnly: true,
        signed: true,
      };

      if (req.auth.user === 'admin') {
        res.cookie('name', 'admin', options).send({ screen: 'admin' });
      } else if (req.auth.user === 'user') {
        res.cookie('name', 'user', options).send({ screen: 'user' });
      }
      res.send({ auth: 'ok' });
    });

    this.app.get('/api', (req, res) => {
      res.send(`Hello , From server`);
    });

    this.app.post('/api/data', (req, res) => {
      const body = req.body;
      this.dataProxy.getData().map((e) => {
        if (
          e.model === body.model &&
          e.scenario === body.scenario &&
          e.region === body.region &&
          e.variable === body.variable
        ) {
          res.status(200).send(e);
        }
      });
      res.status(404).send([]);
    });

    this.app.post('/api/plotData', (req, res) => {
      const body = req.body;
      const response: any[] = [];
      for (const reqData of body) {
        const elements = this.dataProxy
          .getData()
          .filter(
            (e) => e.model === reqData.model && e.scenario === reqData.scenario
          );
        if (elements) {
          response.push(...elements);
        }
      }
      res.status(200).send(response);
    });

    this.app.get('/api/models', (req, res) => {
      let models: string[] = [];
      filterData.forEach((data) => {
        models.push(data.model);
      });

      models = [...new Set(models)];

      res.send(models);
    });

    this.app.get('/api/scenarios', (req, res) => {
      let scenarios: string[] = [];
      filterData.forEach((data) => {
        scenarios.push(data.scenario);
      });

      scenarios = [...new Set(scenarios)];

      res.send(scenarios);
    });

    this.app.get('/api/scenarios', (req, res) => {
      res.send(this.dataProxy.getScenarios());
    });

    this.app.get(`/api/variables`, (req, res) => {
      res.send(this.dataProxy.getVariables());
    });

    this.app.get(`/api/regions`, (req, res) => {
      res.send(this.dataProxy.getRegions());
    });

    this.app.post(`/api/filter`, (req, res) => {
      const data = req.body;
      const result: { [id: string]: string[] } = {
        "regions": [],
        "models": [],
        "scenarios": [],
        "variables": []
      }
      switch (data.type) {
        case "regions":
          data.data.map(region => {
            const filtered: any[] = this.dataProxy.getData().filter(dataElement => dataElement.region === region).map(e => e);
            const models = filtered.map(data => data.model) as string[];
            const scenarios = filtered.map(data => data.scenario) as string[];
            const variables = filtered.map(data => data.variable) as string[];

            result["models"] = [...new Set([...result["models"], ...models])];
            result["scenarios"] = [...new Set([...result["scenarios"], ...scenarios])];
            result["variables"] = [...new Set([...result["variables"], ...variables])];
          });
          break;

        case "variables":
          data.data.map(variable => {
            const filtered: any[] = this.dataProxy.getData().filter(dataElement => dataElement.variable === variable).map(e => e);
            const models = filtered.map(data => data.model) as string[];
            const scenarios = filtered.map(data => data.scenario) as string[];
            const regions = filtered.map(data => data.region) as string[];

            result["models"] = [...new Set([...result["models"], ...models])];
            result["scenarios"] = [...new Set([...result["scenarios"], ...scenarios])];
            result["regions"] = [...new Set([...result["regions"], ...regions])];
          })
          break;

        case "scenarios":
          data.data.map(scenario => {
            const filtered: any[] = this.dataProxy.getData().filter(dataElement => dataElement.scenario === scenario).map(e => e);
            const models = filtered.map(data => data.model) as string[];
            const variables = filtered.map(data => data.scenario) as string[];
            const regions = filtered.map(data => data.region) as string[];

            result["models"] = [...new Set([...result["models"], ...models])];
            result["variables"] = [...new Set([...result["variables"], ...variables])];
            result["regions"] = [...new Set([...result["regions"], ...regions])];
          })
          break;

        case "models":
          data.data.map(model => {
            const filtered: any[] = this.dataProxy.getData().filter(dataElement => dataElement.model === model).map(e => e);
            const scenarios = filtered.map(data => data.scenario) as string[];
            const variables = filtered.map(data => data.variable) as string[];
            const regions = filtered.map(data => data.region) as string[];

            result["scenarios"] = [...new Set([...result["scenarios"], ...scenarios])];
            result["variables"] = [...new Set([...result["variables"], ...variables])];
            result["regions"] = [...new Set([...result["regions"], ...regions])];
          })
          break;
      }
      res.send(result);
    });

    // Posts methods
    this.app.post(`/api/dashboard/save`, async (req, res, next) => {
      try {
        const id = await this.dbClient.getClient().incr('dashboards:id');
        await this.dbClient
          .getClient()
          .json.set('dashboards', `.${id}`, req.body);
        res.send(JSON.stringify({ id: id }));
      } catch (err) {
        console.error(err);
        next(err);
      }
    });

    this.app.get(`/api/dashboards/:id`, async (req, res, next) => {
      try {
        const id = req.params.id;
        const dashboard = await this.dbClient
          .getClient()
          .json.get('dashboards', { path: [`.${id}`] });
        res.send(dashboard);
      } catch (err) {
        console.error(err);
        next(err);
      }
    });

    this.app.get(`/api/dashboards`, async (req, res, next) => {
      try {
        const latestId = await this.dbClient.getClient().get('dashboards:id');
        const idsToFetch = [latestId];
        // Get the 5 last published dashboards
        for (let i = 1; i < 5; i++) {
          idsToFetch.push(latestId - i);
        }
        const dashboards: any[] = [];
        for (let i = latestId; i > latestId - 5; i--) {
          try {
            const dashboard = await this.dbClient
              .getClient()
              .json.get('dashboards', { path: i.toString() });
            dashboards.push(dashboard)
          } catch (e) {
            // no dashboard found for id
          }
        }

        res.send(dashboards);
      } catch (err) {
        console.error(err);
        next(err);
      }
    });

    this.app.get('/api/browse/init', async (req, res, next) => {
      try {
        const data = await this.dbClient
          .getClient()
          .json.mGet(['authors', 'tags'], '.');
        // data is returned as: [ { author1: [], author2: [], ... }, { tag1: [], tag2: [], ... } ]
        const authors = data[0];
        const tags = data[1];
        res.send({ authors, tags });
      } catch (err) {
        console.error(err);
        next(err);
      }
    });

    this.app.post('/api/browse', async (req, res, next) => {
      try {
        const { dashboards } = req.body;
        const data = await this.dbClient
          .getClient()
          .json.get('dashboards', { path: dashboards.map(String) });
        let results = {}
        if (dashboards.length === 1) {
          results[dashboards[0]] = data;
        } else {
          results = Object.entries(data).reduce(
            (obj, [key, dashboard]) => Object.assign(obj, { [key]: dashboard }),
            {}
          );
        }

        res.send(results);
      } catch (err) {
        console.error(err);
        next(err);
      }
    });

    // Serve the HTML page
    this.app.get('*', (req: any, res: any) => {
      res.sendFile(join(__dirname, this.clientPath, 'index.html'));
    });
  };

  startup = () => {
    // start the Express server
    this.app.listen(this.port, () => {
      console.log(`app started at http://localhost:${this.port}`);
    });
  };
}
