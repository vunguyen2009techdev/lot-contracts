# LOT Contracts

### Get started

```
npm i
```

Create `.env` according to `.env.example`

### Test

```
npm test
```

### Lint

```
npm run lint
```

### Deploy

```
npx hardhat run --network <your-network> scripts/deploy-testnet.js
```

### Verify

```
npx hardhat verify --network <your-network> <contract-address> <constructor-argument>...
```
