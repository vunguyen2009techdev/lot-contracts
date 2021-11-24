// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./LandNFT.sol";

contract LandNFTCrowdsale is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20Metadata;

    IERC20Metadata public immutable paymentToken;
    uint256 public tokenUnit;
    LandNFT public immutable nft;

    struct Parcel {
        uint256 price;
        uint256 cap;
        uint256 supply;
    }

    mapping(uint256 => Parcel) public parcels;
    mapping(uint256 => bool) public itemIds;

    event Buy(address indexed buyer, uint256 indexed itemId, uint256 price);

    event ListedItem(
        uint256 indexed itemId,
        uint256 price,
        uint256 cap,
        uint256 supply
    );

    /// @param owner The address of admin and holding fund
    /// @param token The address of payment token i.e. USDT contract's address
    constructor(address owner, address token) {
        transferOwnership(owner);

        nft = new LandNFT(
            "Land NFT",
            "LLOT",
            "https://api.landoftitans.net/nft/land/"
        );
        nft.grantRole(nft.DEFAULT_ADMIN_ROLE(), owner);

        paymentToken = IERC20Metadata(token);
        tokenUnit = 10**paymentToken.decimals();
    }

    /// @notice Listed item's sale info
    /// @dev Supply will be carried on and cannot be overwritten
    /// @param _itemId Unique identifier per parcel type
    /// @param _price Sale price in the smallest unit i.e. wei
    /// @param _cap Maximum supply
    function listedItem(
        uint256 _itemId,
        uint256 _price,
        uint256 _cap
    ) public onlyOwner {
        // carry on existing supply
        uint256 currentSupply = parcels[_itemId].supply;
        parcels[_itemId] = Parcel(_price, _cap, currentSupply);
        emit ListedItem(_itemId, _price, _cap, currentSupply);
    }

    /// @notice Buy a single/multiples NFT
    /// @dev Use _itemId to associate the purchase order with tokenId
    /// @param _itemId Unique number generated on the front-end
    function buy(uint256 _itemId, uint256 quantity) public nonReentrant {
        require(!itemIds[_itemId], "LandNFT: tag already used");
        require(quantity > 0, "LandNFT: quantity must from 1 and above");
        itemIds[_itemId] = true;

        Parcel memory parcel = parcels[_itemId];
        uint256 price = parcel.price;
        uint256 cap = parcel.cap;
        uint256 supply = parcel.supply;

        require(price > 0, "LandNFT: price was not set");
        require(supply < cap, "LandNFT: supply reached cap");
        require(
            price % quantity == 0,
            "LandNFT: price must be corresponding to quantity"
        );

        for (uint256 i = 0; i < quantity; i += 1) {
            supply += 1;
            parcels[_itemId].supply = supply;
            address buyer = msg.sender;
            paymentToken.safeTransferFrom(buyer, owner(), price / quantity);
            nft.mint(buyer);
            emit Buy(buyer, _itemId, price);
        }
    }
}
