import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import path, { join } from 'path';

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
    this.app.use(bodyParser.json());
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
      res.send(this.dataProxy.getModels());
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
        const dashboards = await this.dbClient
          .getClient()
          .json.get('dashboards');
        const result = Object.keys(dashboards)
          .reverse() // Reverse the order as the lastest publications have the greatest ids
          .slice(0, 5) // Limit to 5 elements
          .reduce((obj, id) => {
            // As the id is a number, we add a dot to keep the insertion order
            obj[`${id}.`] = dashboards[id];
            return obj;
          }, {});
        res.send(result);
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
        const models = this.dataProxy.getModels();
        res.send({ authors, tags, models });
      } catch (err) {
        console.error(err);
        next(err);
      }
    });

    this.app.post('/api/browse', async (req, res, next) => {
      // Find the requested DataModel (i.e. Model&Scenario) in the dashboard
      const findDataModel = (model, scenarios, dashboard) => {
        // Loop in dashboard blocks
        for (const block of Object.values((dashboard as any).blocks)) {
          const models = (block as any).config.metaData.models;
          // Find the model and scenarios in the dashboard
          for (const [_model, _scenarios] of Object.entries(models)) {
            if (model === _model) {
              const found = scenarios.some((scenario) => {
                return (_scenarios as Array<string>).indexOf(scenario) > -1;
              });
              if (found) {
                return true;
              }
            }
          }
        }
        return false;
      };

      try {
        const { dashboards, model, scenarios, title } = req.body;
        const data = await this.dbClient
          .getClient()
          .json.get('dashboards', { path: dashboards.map(String) });
        const results = Object.entries(data)
          // Filter the data with info from req.body
          .filter(([_, dashboard]) => {
            let toKeep = true;
            // Find provided title in dashboard's data
            if (title) {
              const dbTitle = (dashboard as any).userData.title.toLowerCase();
              const usTitle = title.toLowerCase();
              toKeep = dbTitle.indexOf(usTitle) > -1;
            }
            // Compare model&scenario
            if (model && scenarios) {
              toKeep = findDataModel(model, scenarios, dashboard);
            }
            return toKeep;
          })
          // Reduce as an object
          .reduce(
            (obj, [key, dashboard]) => Object.assign(obj, { [key]: dashboard }),
            {}
          );
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
