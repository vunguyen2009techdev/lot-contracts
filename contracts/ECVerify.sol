// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ECVerify {
    function etherHash(bytes32 _hash) public pure returns (bytes32) {
        bytes memory prefix = "\x19Ethereum Signed Message:\n32";
        return keccak256(abi.encodePacked(prefix, _hash));
    }

    function ecrecovery(bytes32 _hash, bytes memory _sig)
        public
        pure
        returns (address)
    {
        bytes32 r;
        bytes32 s;
        uint8 v;

        require(_sig.length == 65, "signature length not match");

        assembly {
            r := mload(add(_sig, 32))
            s := mload(add(_sig, 64))
            v := and(mload(add(_sig, 65)), 255)
        }

        return ecrecover(_hash, v, r, s);
    }

    function ecverify(
        bytes32 _hash,
        bytes memory _sig,
        address _signer
    ) public pure returns (bool) {
        return _signer == ecrecovery(_hash, _sig);
    }
}
