// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./LandNFT.sol";

contract LandNFTCrowdsale is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20Metadata;

    IERC20Metadata public immutable paymentToken;
    LandNFT public immutable nft;

    uint8 public constant PARCEL_1x1 = 1;
    uint8 public constant PARCEL_5x5 = 5;
    uint8 public constant PARCEL_8x8 = 8;
    uint8 public constant PARCEL_10x10 = 10;
    uint8 public constant PARCEL_15x15 = 15;

    struct Parcel {
        uint256 price;
        uint256 cap;
        uint256 supply;
    }

    mapping(uint8 => Parcel) public parcels;
    mapping(uint256 => bool) public tags;

    event Buy(
        address indexed buyer,
        uint8 indexed parcelId,
        uint256 indexed tag,
        uint256 price
    );

    event UpdateParcel(
        uint8 indexed parcelId,
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
        uint256 tokenUnit = 10**paymentToken.decimals();

        parcels[PARCEL_1x1] = Parcel(1 * tokenUnit, 23597, 0);
        parcels[PARCEL_5x5] = Parcel(2 * tokenUnit, 8925 + 15731, 0);
        parcels[PARCEL_8x8] = Parcel(3 * tokenUnit, 15744 + 23597, 0);
        parcels[PARCEL_10x10] = Parcel(4 * tokenUnit, 7900 + 11798, 0);
        parcels[PARCEL_15x15] = Parcel(5 * tokenUnit, 8775 + 3933, 0);
    }

    /// @notice Update parcel's sale info
    /// @dev Supply will be carried on and cannot be overwritten
    /// @param parcelId Unique identifier per parcel type
    /// @param price Sale price in the smallest unit i.e. wei
    /// @param cap Maximum supply
    function updateParcel(
        uint8 parcelId,
        uint256 price,
        uint256 cap
    ) public onlyOwner {
        // carry on existing supply
        uint256 currentSupply = parcels[parcelId].supply;
        parcels[parcelId] = Parcel(price, cap, currentSupply);
        emit UpdateParcel(parcelId, price, cap, currentSupply);
    }

    /// @notice Buy a single NFT
    /// @dev Use tag to associate the purchase order with tokenId
    /// @param parcelId Unique identifier per parcel type
    /// @param tag Unique number generated on the front-end
    function buy(uint8 parcelId, uint256 tag) public nonReentrant {
        require(!tags[tag], "LandNFT: tag already used");
        tags[tag] = true;

        Parcel memory parcel = parcels[parcelId];
        uint256 price = parcel.price;
        uint256 supply = parcel.supply;
        uint256 cap = parcel.cap;

        require(price > 0, "LandNFT: price was not set");
        require(supply < cap, "LandNFT: supply reached cap");

        parcels[parcelId].supply = supply + 1;

        address buyer = msg.sender;
        paymentToken.safeTransferFrom(buyer, owner(), price);
        nft.mint(buyer);
        emit Buy(buyer, parcelId, tag, price);
    }
}
