// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract SimpleNFTLock is Ownable {
    IERC721 public immutable erc721;
    /// map of tokenId and its staker
    mapping(uint256 => address) public stakerOf;

    event Lock(address indexed staker, uint256 indexed tokenId);
    event Unlock(address indexed staker, uint256 indexed tokenId);

    constructor(IERC721 _erc721) {
        erc721 = _erc721;
    }

    function lock(uint256 tokenId) public {
        address staker = erc721.ownerOf(tokenId);
        require(
            staker == msg.sender,
            "SimpleNFTLock: msg.sender must be the owner of tokenId"
        );
        require(
            stakerOf[tokenId] == address(0),
            "SimpleNFTLock: tokenId already staked"
        );

        stakerOf[tokenId] = staker;

        erc721.transferFrom(staker, address(this), tokenId);
        emit Lock(staker, tokenId);
    }

    function unlock(uint256 tokenId) public {
        address staker = stakerOf[tokenId];
        require(
            msg.sender == staker || msg.sender == owner(),
            "SimpleNFTLock: msg.sender must be the staker or owner"
        );

        delete stakerOf[tokenId];

        erc721.transferFrom(address(this), staker, tokenId);
        emit Unlock(staker, tokenId);
    }
}
