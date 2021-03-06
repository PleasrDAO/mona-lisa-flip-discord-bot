require("dotenv").config();

// Require the necessary discord.js classes
import { Client, Intents } from "discord.js";

import { ethers } from "ethers";
import { Contract } from "@ethersproject/contracts";

import abi from "./lib/abi";

export const provider = new ethers.providers.InfuraProvider(
  1,
  process.env.INFURA_PROJECT
);

const DOG_WETH_PAIR = "0xc96f20099d96b37d7ede66ff9e4de59b9b1065b1";
const USDC_WETH_PAIR = "0x397ff1542f962076d0bfe58ea045ffa2d347aca0";

const DOG_SUPPLY = 16_969_696_969;
const MONA_LISA_VALUE = 870_000_000;

const dogWethSushiswap = new Contract(DOG_WETH_PAIR, abi, provider);

const usdcWethSushiswap = new Contract(USDC_WETH_PAIR, abi, provider);

var showPixelPrice = false;

async function getDogEthPrice() {
  const [r0, r1] = await dogWethSushiswap.functions["getReserves"]();

  console.log(r0.toString(), r1.toString());

  const price = r1 / r0;
  return price;
}

async function getEthUsdPrice() {
  const [r0, r1] = await usdcWethSushiswap.functions["getReserves"]();

  const price = r0.div(r1.div(1e12));
  return price;
}

async function getDogUsdPrice() {
  const [dogEthPrice, ethUsdPrice] = await Promise.all([
    getDogEthPrice(),
    getEthUsdPrice(),
  ]);

  return dogEthPrice * ethUsdPrice;
}

async function monaLisaPercentage(dogUsdPrice: number) {
  return ((dogUsdPrice * DOG_SUPPLY) / MONA_LISA_VALUE) * 100;
}

async function tick(client: Client) {
  const [dogUsdPrice] = await Promise.all([getDogUsdPrice()]);
  const monaLisaP = monaLisaPercentage(dogUsdPrice);
  const presenceStatus = showPixelPrice ?  ((dogUsdPrice * 55240).toPrecision(4).toString() + " per pixel." ) : (dogUsdPrice.toPrecision(4));

  const guilds = client.guilds.cache;
  await Promise.all(
    guilds.map(async (guild) => {
      const g = await guild.fetch();
      const n = g.me?.nickname;

      g.me?.setNickname(`${(await monaLisaP).toPrecision(3)}%`);
    })
  );

  await client.user?.setPresence({
    activity: { name: `\$${presenceStatus}`, type: 3 },
    status: "online",
  });

  showPixelPrice = !showPixelPrice;
}

async function go() {
  const client = new Client({ ws: { intents: [Intents.FLAGS.GUILDS] } });
  client.on("debug", console.log);
  await client.login(process.env.DISCORD_TOKEN);
  console.log("logged in");
  tick(client);
  setInterval(() => tick(client), 1000 * 60);
}

console.log("hello", process.env.DISCORD_TOKEN, process.env.INFURA_PRWOJECT);
go();
