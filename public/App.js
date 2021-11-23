import Web3 from "web3";
import BigNumber from "big-number";
import { useState } from "react";

import {
  crowdsaleAddress,
  crowdsaleAddressABI,
  coinAddress,
  coinAddressABI,
  nftLotAddress,
  nftLotAddressABI,
} from "./config";

function App() {
  // parcelId was from parcel defined: 1, 5, 8, 10, 15
  const parcelId = 1;
  // tag is a random number from FE and it's unique on per transaction (not duplicate again)
  const tag = 2001;
  const sc_coin = BigNumber(1 * 10 ** 18);
  const [web3, setWeb3] = useState();
  const [info, setInfo] = useState();

  const connectWallet = async () => {
    if (typeof window.ethereum !== "undefined") {
      // Instance web3 with the provided information
      setWeb3(new Web3(window.ethereum));
      try {
        // Request account access
        await window.ethereum.request({ method: "eth_requestAccounts" });
        return true;
      } catch (e) {
        // User denied access
        return false;
      }
    }
  };

  const buyOneNFT = async () => {
    if (typeof window.ethereum !== "undefined") {
      if (!web3) {
        return alert("Please connect wallet!");
      }
      await window.ethereum.request({ method: "eth_requestAccounts" });

      const accounts = await web3.eth.getAccounts();
      const account = accounts[0];

      const crowdsaleContract = new web3.eth.Contract(
        crowdsaleAddressABI,
        crowdsaleAddress
      );

      const coinContract = new web3.eth.Contract(coinAddressABI, coinAddress);

      // approve USDT/LOT amount to contract, amount approve to contract depend from parcel available
      const approveCoin = await coinContract.methods
        .approve(crowdsaleContract._address, sc_coin)
        .send({ from: account });

      // get result and query as example: https://testnet.bscscan.com/tx/0x811f6fde92e7a10b55e66f5f718af0e147a65c4cf899806957e42fce0b0b58f6
      console.log("approveCoin", approveCoin.transactionHash);

      if (approveCoin && approveCoin.transactionHash) {
        const buyNFT = await crowdsaleContract.methods
          .buy(parcelId, tag)
          .send({ from: account });
        console.log("buyNFT", buyNFT);
      }
    }
  };

  const getInfo = async () => {
    if (typeof window.ethereum !== "undefined") {
      if (!web3) {
        return alert("Please connect wallet!");
      }
      const accounts = await web3.eth.getAccounts();
      const account = accounts[0];

      // get network balance
      const balance = await web3.eth.getBalance(account);
      if (balance) {
        setInfo((prevState) => ({ ...prevState, networkBalance: balance }));
      }

      const coinContract = new web3.eth.Contract(coinAddressABI, coinAddress);
      const decimal = await coinContract.methods.decimals().call();

      coinContract.methods.balanceOf(account).call((err, result) => {
        if (err) {
          console.log("error: ", err);
          return err;
        }
        // check banlanceOf account
        setInfo((prevState) => ({
          ...prevState,
          coinBalance: result / 10 ** decimal,
        }));
      });

      const nftContract = new web3.eth.Contract(
        nftLotAddressABI,
        nftLotAddress
      );
      nftContract.methods.balanceOf(account).call((err, result) => {
        if (err) {
          console.log("error: ", err);
          return err;
        }
        // check balanceOf nft
        setInfo((prevState) => ({ ...prevState, nftBalance: result }));
      });
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        {info &&
          (info.hasOwnProperty("networkBalance") ||
            info.hasOwnProperty("coinBalance") ||
            info.hasOwnProperty("nftBalance")) && (
            <div>
              <h6>Balances</h6>
              <ul>
                <li>Network: {info.networkBalance / 1e18}</li>
                <li>Coin: {info.coinBalance}</li>
                <li>NFT: {info.nftBalance}</li>
              </ul>
            </div>
          )}

        <button onClick={() => connectWallet()}>connect wallet</button>
        <button onClick={() => buyOneNFT()}>Buy 1 NFT item now</button>
        <button onClick={() => getInfo()}>Get balance</button>
      </header>
    </div>
  );
}

export default App;
