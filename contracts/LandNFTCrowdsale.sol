// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./LandNFT.sol";

contract LandNFTCrowdsale is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    LandNFT public immutable nft;
    IERC20 private paymentToken;

    struct Parcel {
        uint256 price;
        uint256 cap;
        uint256 supply;
    }

    mapping(uint256 => Parcel) public parcels;

    event Buy(
        address indexed buyer,
        uint256 indexed itemId,
        uint256 price,
        uint256 cap,
        uint256 supply
    );

    event ListedItem(
        uint256 indexed itemId,
        uint256 price,
        uint256 cap,
        uint256 supply,
        address indexed erc20Token
    );

    /// @param owner The address of admin and holding fund
    constructor(address owner) {
        transferOwnership(owner);

        nft = new LandNFT(
            "Land NFT",
            "LLOT",
            "https://api.landoftitans.net/nft/land/"
        );
        nft.grantRole(nft.DEFAULT_ADMIN_ROLE(), owner);
    }

    /// @notice Listed item's sale info
    /// @dev Supply will be carried on and cannot be overwritten
    /// @param _erc20Token The address of payment token i.e. USDT contract's address
    /// @param _itemId Unique identifier per parcel type
    /// @param _price Sale price in the smallest unit i.e. wei
    /// @param _cap Maximum supply
    function listedItem(
        address _erc20Token,
        uint256 _itemId,
        uint256 _price,
        uint256 _cap
    ) public onlyOwner {
        // carry on existing supply
        paymentToken = IERC20(_erc20Token);
        uint256 currentSupply = parcels[_itemId].supply;
        parcels[_itemId] = Parcel(_price, _cap, currentSupply);
        emit ListedItem(_itemId, _price, _cap, currentSupply, _erc20Token);
    }

    /// @notice Buy a single/multiples NFT
    /// @dev Use _itemId to associate the purchase order with tokenId
    /// @param _itemId Unique number generated on the front-end
    /// @param _quantity Amount nft which user want to buy
    function buy(uint256 _itemId, uint256 _quantity) public nonReentrant {
        require(_quantity > 0, "LandNFT: quantity must from 1 and above");

        Parcel memory parcel = parcels[_itemId];
        uint256 price = parcel.price;
        uint256 cap = parcel.cap;
        uint256 supply = parcel.supply;

        require(price > 0, "LandNFT: price was not set");
        require(paymentToken.balanceOf(msg.sender) >= price, "LandNFT: Insufficient balance");
        require(paymentToken.allowance(msg.sender, address(this)) >= price, "LandNFT: Insufficient allowance");

        supply += _quantity;
        require(supply <= cap, "LandNFT: supply reached cap");
        parcels[_itemId].supply = supply;
        address buyer = msg.sender;
        paymentToken.safeTransferFrom(buyer, owner(), price * _quantity);

        for (uint256 i = 0; i < _quantity; i += 1) {
            nft.mint(buyer);
        }
        emit Buy(buyer, _itemId, price, cap, supply);
    }
}
