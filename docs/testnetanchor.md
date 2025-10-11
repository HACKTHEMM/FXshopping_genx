What you created are **custom assets** on the Stellar testnet, not anchors themselves. The tokens (INRTOKEN and USDTOKEN) are what an anchor would *issue*, but you still need to build the anchor infrastructure around them.[1][2][3][4]

## What You Have vs What You Need

**Current Status**: You've issued two assets on testnet that represent INR and USD. These are just tokens sitting on the Stellar network.[2][1]

**What's Missing**: The anchor functionality—the actual services that let users deposit fiat and receive your tokens, or redeem your tokens for fiat. This includes:[4][5][6]

- SEP-6, SEP-24, or SEP-31 endpoints (APIs for deposits/withdrawals)
- A `.well-known/stellar.toml` file on your domain
- KYC/authentication flows
- Backend services to handle requests
- A database to track deposits and withdrawals

## This Is Actually a Simulated Anchor

For your hackathon, what you've started is perfect for a **simulated anchor** approach:[6][7]

1. Your tokens represent the value (INRTOKEN = INR, USDTOKEN = USD)
2. You build a simple frontend where users "deposit" (you just send them tokens)
3. They can trade/send these tokens on Stellar's DEX
4. They "withdraw" by sending tokens back to you

You don't need real fiat integration for a hackathon demo—just simulate the deposit/withdrawal flows in your UI. The Stellar Anchor Platform can help you build the proper SEP endpoints if you want to make it more realistic, but for a proof-of-concept, your custom tokens plus a simple interface demonstrating the flow is completely valid.[7][6]

**Testnet anchors** would be official Stellar-provided testing services, whereas you're building your own simulated version—which is actually better for showcasing your specific use case.[6]

[1](https://developers.stellar.org/docs/learn/fundamentals/anchors)
[2](https://www.lumenauts.com/lessons/assets-and-anchors)
[3](https://stellar.org/learn/anchor-basics)
[4](https://cheesecakelabs.com/blog/stellar-anchor/)
[5](https://help.finclusive.com/en_US/stellar-transactions/what-is-a-stellar-anchor)
[6](https://jamesbachini.com/stellar-anchor-platform/)
[7](https://www.youtube.com/watch?v=57iZMxAr_1Y)