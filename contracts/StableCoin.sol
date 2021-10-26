// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/presets/ERC20PresetFixedSupply.sol";

contract StableCoin is ERC20PresetFixedSupply {
    constructor()
        ERC20PresetFixedSupply("StableCoin", "SC", 1000 ether, msg.sender)
    {}
}
