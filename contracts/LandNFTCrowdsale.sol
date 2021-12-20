// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/presets/ERC721PresetMinterPauserAutoIdUpgradeable.sol";

contract LandNFTCrowdsale is
    Initializable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable
{
    using SafeERC20Upgradeable for IERC20Upgradeable;

    ERC721PresetMinterPauserAutoIdUpgradeable public nft;

    struct Parcel {
        uint256 price;
        address erc20Address;
        uint256 cap;
        uint256 supply;
    }

    mapping(uint256 => Parcel) public parcels;

    event Buy(
        address indexed buyer,
        uint256 indexed itemId,
        uint256 quantity,
        uint256 price,
        address erc20Address
    );

    event ListedItem(
        uint256 indexed itemId,
        uint256 price,
        address erc20Address,
        uint256 cap
    );

    function initialize(address _owner, address _nft) public initializer {
        __Ownable_init();
        transferOwnership(_owner);
        nft = ERC721PresetMinterPauserAutoIdUpgradeable(_nft);
    }

    /// @notice Listed item's sale info
    /// @dev Supply will be carried on and cannot be overwritten
    /// @param _itemId Unique identifier defined by the LOT backend
    /// @param _price Sale price in the smallest unit i.e. wei
    /// @param _erc20Address The address of payment token i.e. USDT contract's address
    /// @param _cap Maximum supply
    function listedItem(
        uint256 _itemId,
        uint256 _price,
        address _erc20Address,
        uint256 _cap
    ) public onlyOwner {
        // carry on existing supply
        uint256 currentSupply = parcels[_itemId].supply;
        parcels[_itemId] = Parcel(_price, _erc20Address, _cap, currentSupply);
        emit ListedItem(_itemId, _price, _erc20Address, _cap);
    }

    /// @notice Buy one or many NFTs
    /// @dev Use transaction logs to get the tokenId's of newly minted NFTs
    /// @param _itemId Unique identifier defined by the LOT backend
    /// @param _quantity Amount nft which user want to buy
    function buy(uint256 _itemId, uint256 _quantity) public nonReentrant {
        require(_quantity > 0, "LandNFT: quantity must from 1 and above");

        Parcel memory parcel = parcels[_itemId];
        uint256 price = parcel.price;
        address erc20Address = parcel.erc20Address;
        IERC20Upgradeable paymentToken = IERC20Upgradeable(parcel.erc20Address);
        uint256 cap = parcel.cap;
        uint256 supply = parcel.supply;

        require(price > 0, "LandNFT: price was not set");

        supply += _quantity;
        require(supply <= cap, "LandNFT: supply reached cap");
        parcels[_itemId].supply = supply;
        address buyer = msg.sender;
        paymentToken.safeTransferFrom(buyer, owner(), price * _quantity);

        for (uint256 i = 0; i < _quantity; i += 1) {
            nft.mint(buyer);
        }
        emit Buy(buyer, _itemId, _quantity, price, erc20Address);
    }
}
