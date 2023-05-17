
// TODO add interface
export default class Filter {

    private body = {};
    private selectOrder?: string[];
    private dataFocusFilters?: any;
    constructor(globalSelectedData, dataFocusFilters?: any, selectOrder?: string[]) {
        this.selectOrder = selectOrder;
        this.dataFocusFilters = dataFocusFilters;
        this.body = {
            "models": this.modelBody(globalSelectedData),
            "scenarios": this.scenarioBody(globalSelectedData),
            "regions": this.regionsBody(globalSelectedData),
            "variables": this.variableBody(globalSelectedData),
            "units": this.unitsBody(globalSelectedData),
            "versions": this.versionsBody(globalSelectedData)

        };
    }

    getBody = (filterId) => {
        return this.body[filterId] != null ? this.body[filterId] : {};
    }

    regionsBody = (globalSelectedData) => {
        const filtersToApply = this.getFiltersToApply("regions", this.selectOrder);
        let selectedData = this.getSelectedDataOfFilter(globalSelectedData, filtersToApply);
        selectedData = this.addDataFocusToSelectedData(selectedData);

        const requestBody: FilterSchema = {};

        if (selectedData["variables"]?.length > 0) {
            requestBody.variable = { name__in: selectedData["variables"] };
        }

        if (selectedData["units"]?.length > 0) {
            requestBody.unit = { name__in: selectedData["units"] };
        }

        if (selectedData["scenarios"]?.length > 0) {
            requestBody.run = {
                scenario: { name__in: selectedData["scenarios"] }
            };
        }

        if (selectedData["models"]?.length > 0) {
            requestBody.run = {
                model: { name__in: selectedData["models"] }
            };
        }

        return requestBody;

    }

    variableBody = (globalSelectedData) => {
        const filtersToApply = this.getFiltersToApply("variables", this.selectOrder);
        let selectedData = this.getSelectedDataOfFilter(globalSelectedData, filtersToApply);
        selectedData = this.addDataFocusToSelectedData(selectedData);

        const requestBody: FilterSchema = {};

        if (selectedData["regions"]?.length > 0) {
            requestBody.region = { name__in: selectedData["regions"] };
        }

        if (selectedData["units"]?.length > 0) {
            requestBody.unit = { name__in: selectedData["units"] };
        }

        if (selectedData["scenarios"]?.length > 0) {
            requestBody.run = {
                scenario: { name__in: selectedData["scenarios"] }
            };
        }

        if (selectedData["models"]?.length > 0) {
            requestBody.run = {
                model: { name__in: selectedData["models"] }
            };
        }

        return requestBody;
    }

    modelBody = (globalSelectedData) => {
        const filtersToApply = this.getFiltersToApply("models", this.selectOrder);
        let selectedData = this.getSelectedDataOfFilter(globalSelectedData, filtersToApply);
        selectedData = this.addDataFocusToSelectedData(selectedData);

        const requestBody: FilterSchema = {};

        if (selectedData["regions"]?.length > 0) {
            requestBody.region = { name__in: selectedData["regions"] };
        }

        if (selectedData["variables"]?.length > 0) {
            requestBody.variable = { name__in: selectedData["variables"] };
        }

        if (selectedData["units"]?.length > 0) {
            requestBody.unit = { name__in: selectedData["units"] };
        }

        if (selectedData["scenarios"]?.length > 0) {
            requestBody.run = {
                scenario: { name__in: selectedData["scenarios"] }
            };
        }
        return requestBody;
    }

    unitsBody = (globalSelectedData) => {
        return null
    }

    versionsBody = (globalSelectedData) => {
        const filtersToApply = this.getFiltersToApply("models", this.selectOrder);
        let selectedData = this.getSelectedDataOfFilter(globalSelectedData, filtersToApply);
        selectedData = this.addDataFocusToSelectedData(selectedData);

        const requestBody: FilterSchema = {};

        if (selectedData["regions"]?.length > 0) {
            requestBody.region = { name__in: selectedData["regions"] };
        }

        if (selectedData["variables"]?.length > 0) {
            requestBody.variable = { name__in: selectedData["variables"] };
        }

        if (selectedData["units"]?.length > 0) {
            requestBody.unit = { name__in: selectedData["units"] };
        }

        if (selectedData["scenarios"]?.length > 0) {
            requestBody.run = {
                scenario: { name__in: selectedData["scenarios"] }
            };
        }
        return requestBody;
    }

    scenarioBody = (globalSelectedData) => {
        const filtersToApply = this.getFiltersToApply("scenarios", this.selectOrder);
        let selectedData = this.getSelectedDataOfFilter(globalSelectedData, filtersToApply);
        selectedData = this.addDataFocusToSelectedData(selectedData);

        const requestBody: FilterSchema = {};

        if (selectedData["regions"]?.length > 0) {
            requestBody.region = { name__in: selectedData["regions"] };
        }

        if (selectedData["variables"]?.length > 0) {
            requestBody.variable = { name__in: selectedData["variables"] };
        }

        if (selectedData["units"]?.length > 0) {
            requestBody.unit = { name__in: selectedData["units"] };
        }

        if (selectedData["models"]?.length > 0) {
            requestBody.run = {
                model: { name__in: selectedData["models"] }
            };
        }
        return requestBody;
    }

    /**
   * Get filters that has to be used on this filterId (filters that have a lower idx in selectOrder)
   * Special case when scenario and models are in selectOrder, the last selected is replaced by versions and runId
   * in the future to always filter by versions/runId after scenarios or models
   * @param filterId the filter which updates its options
   * @param selectOrder the order of selection (filter)
   * @returns a list of filterId to be applied
   */
    getFiltersToApply(filterId, selectOrder) {

        if (selectOrder != undefined) {
            let lowerIdxFilters;

            if (filterId === "versions") {
                // Get all filters with idx <= idx(models) and idx(scenarios)
                const maxIdx = Math.max(selectOrder.indexOf("models"), selectOrder.indexOf("scenarios"))
                lowerIdxFilters = selectOrder.slice(0, maxIdx + 1) // TODO replace by runId here
            }
            else {
                const filterIdOrder = selectOrder.indexOf(filterId)
                lowerIdxFilters = filterIdOrder < 0
                    ? [...selectOrder] // filterId not in selectOrder, all selectOrder have lower idx
                    : selectOrder.slice(0, filterIdOrder) // only filters with idx lower than filterIdOrder

                // Replace scenarios or models by versions if both in selectOrder, choose the highest idx between them.
                // As it is the same to filter by model/scenario/version or to filter by runId
                // when both scenario and model are selected
                if (["models", "scenarios"].every(item => selectOrder.includes(item))) {
                    const maxIdx = Math.max(selectOrder.indexOf("models"), selectOrder.indexOf("scenarios"))
                    lowerIdxFilters.splice(maxIdx + 1, 0, "versions") // TODO replace by runId here
                }
            }
            return lowerIdxFilters
        } else {
            return [];
        }
    }

    getSelectedDataOfFilter = (selectedData, filtersToApply) => {
        if (filtersToApply.length > 0) {
            const selectedFilterData = {};
            filtersToApply.forEach(key => selectedFilterData[key] = selectedData[key]);
            return selectedFilterData;
        } else {
            return selectedData;
        }
    }

    addDataFocusToSelectedData = (selectedData) => {
        if (this.dataFocusFilters != null) {
            Object.keys(this.dataFocusFilters).forEach(key => {
                let newSelected: string[] = selectedData[key];
                if (newSelected != null) {
                    newSelected = [...newSelected, ...this.dataFocusFilters[key]];
                } else {
                    newSelected = [...this.dataFocusFilters[key]];
                }
                selectedData[key] = Array.from(new Set(newSelected));
            });
        }
        return selectedData;
    }


}