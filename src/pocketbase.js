import PocketBase from "pocketbase";

// const pb = new PocketBase("http://127.0.0.1:8090"); 
// const pb = new PocketBase("https://pocket.alphasoft.world"); 
const pb = new PocketBase("https://api.friendsonlineshop.com");
pb.autoCancellation(false);

export default pb;
