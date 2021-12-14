// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./LandNFT.sol";

contract LandNFTCrowdsaleSignature is Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;
    using SafeERC20 for IERC20;
    LandNFT public immutable nft;
    mapping(address => Counters.Counter) public nonces;

    event Buy(
        address indexed buyer,
        uint256 indexed itemId,
        uint256 quantity,
        uint256 price,
        address erc20Address
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

    function hashPacked(
        uint256 _itemId,
        address _buyerAddress,
        uint256 _quantity,
        uint256 _price,
        address _erc20Address
    ) internal view returns (bytes32 hash) {
        uint256 nonce = nonces[_buyerAddress].current();
        return
            keccak256(
                abi.encodePacked(
                    _itemId,
                    _buyerAddress,
                    _quantity,
                    _price,
                    _erc20Address,
                    nonce
                )
            );
    }

    /// @notice Buy one or many NFTs
    /// @dev Use transaction logs to get the tokenId's of newly minted NFTs
    /// @param _itemId Unique identifier defined by the LOT backend
    /// @param _buyerAddress The address of user who want to buy NFTs
    /// @param _quantity Amount nft which user want to buy
    /// @param _price Sale price defined by the LOT backend Admin in the smallest unit i.e. wei
    /// @param _erc20Address The address of payment token i.e. USDT contract's address
    /// @param _signature Personal signature defined by the LOT backend Admin
    function buy(
        uint256 _itemId,
        address _buyerAddress,
        uint256 _quantity,
        uint256 _price,
        address _erc20Address,
        bytes memory _signature
    ) public nonReentrant {
        require(_quantity > 0, "LandNFT: quantity must from 1 and above");
        require(_price > 0, "LandNFT: price was not set");

        bytes32 hash = hashPacked(
            _itemId,
            _buyerAddress,
            _quantity,
            _price,
            _erc20Address
        );
        bytes32 etherHash = ECDSA.toEthSignedMessageHash(hash);

        address signer = ECDSA.recover(etherHash, _signature);
        require(
            signer == owner(),
            "LandNFT: signature does not match message sender"
        );

        IERC20 paymentToken = IERC20(_erc20Address);

        paymentToken.safeTransferFrom(
            _buyerAddress,
            owner(),
            _price * _quantity
        );

        for (uint256 i = 0; i < _quantity; i += 1) {
            nft.mint(_buyerAddress);
        }

        nonces[_buyerAddress].increment();
        emit Buy(_buyerAddress, _itemId, _quantity, _price, _erc20Address);
    }
}
