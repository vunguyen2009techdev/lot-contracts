const { ethers } = require("hardhat");

function parseObjectFieldBigNumber(data) {
  return Object.entries(data).reduce((prev, current) => {
    let [key, value] = current;

    if (isObject(value) && ethers.BigNumber.isBigNumber(value)) {
      value = ethers.BigNumber.from(value).toString();
      value = parseFloat(value);
    } else if (isObject(value)) {
      value = parseObjectFieldBigNumber(value);
    }

    if (Array.isArray(value)) {
      value = value.map((item) => {
        if (isObject(item) && ethers.BigNumber.isBigNumber(item)) {
          item = ethers.BigNumber.from(item).toBigInt();
          item = parseFloat(item);
        } else if (isObject(item)) item = parseObjectFieldBigNumber(item);
        return item;
      });
    }

    return {
      ...prev,
      [key]: value,
    };
  }, {});
}

export { parseObjectFieldBigNumber };
