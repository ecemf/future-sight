import BlockModel from "../../../models/BlockModel";
import ConfigurationModel from "../../../models/ConfigurationModel";

export function getBlock(blocks: BlockModel[], controlBlockId: string) {
    let controlBlock = new BlockModel();
    if (controlBlockId !== '') {
        controlBlock = blocks[controlBlockId];
    }
    return controlBlock;
}

export function getUnselectedInputOptions(block: BlockModel, optionsLabel: string[]) {
    // Set inputs that still emplty
    const config = block.config as ConfigurationModel;
    if (config.metaData.selectOrder.length > 0) {
        const newOptions: string[] = [];
        optionsLabel.forEach((option) => {
            if (!config.metaData.selectOrder.includes(option)) {
                newOptions.push(option);
            }
        });
        return newOptions;
    } else {
        return optionsLabel;
    }
}

export function getChildrens(blocks, conyrolBlockId) {
    return Object.values(blocks).filter((block: BlockModel | any) => block.controlBlock === conyrolBlockId)
}