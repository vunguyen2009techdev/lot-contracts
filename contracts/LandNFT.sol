// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/presets/ERC721PresetMinterPauserAutoIdUpgradeable.sol";

contract LandNFT is
    Initializable,
    OwnableUpgradeable,
    ERC721PresetMinterPauserAutoIdUpgradeable
{
    function initialize(
        string memory name,
        string memory symbol,
        string memory baseTokenURI
    ) public virtual override initializer {
        __Ownable_init();
        __ERC721PresetMinterPauserAutoId_init(name, symbol, baseTokenURI);
    }

    function setTransferOwnership() external {
        grantRole(MINTER_ROLE, msg.sender);
        transferOwnership(msg.sender);
    }
}
