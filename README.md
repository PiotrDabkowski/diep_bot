### Fully autonomous Diep.io bot

Some YouTube videos showing bots in action: [by me](https://www.youtube.com/watch?v=msi5ATiln3U), [by another player](https://www.youtube.com/watch?v=DzugOGdx518).

Supports few tanks: AC, Fighter, Ram Ani, Dragon, Sniper, Predator.
Automatically aims and follows the enemy. Does not dodge the bullets yet, though.

To build the Tampermonkey extension:

```{ cat src/ext.meta.js &  node build.js ;} | cat > extension_bundle.js```

To run the headless version and create a fighter bot in the sandbox use:

```
node src/headless.js --tank=fighter --party=diep.io/#93D6474700DDEC0D5013C7
```

Note: you can have at most 2 diep.io connections per ip. This can be bypassed by using a trick with ip6 subrange.

#### Limitations

NOTE: THIS IS JUST PART OF THE FULL BOT REPO THAT I DECIDED TO MAKE PUBLIC. THE WORKING BOT (AS SEEN IN YT VIDEOS) IS PRIVATE FOR SAFETY REASONS. THIS REPO IS FOR ILLUSTRATIVE PURPOSES.

This bot still works, but is much less inteligent and the parser needs to be updated (due to the field updates).

I have not fully deciphered the 0x00 packet, but I am able to fully parse ~99.5% of them 
so the bot is able to play properly. 

An example of 0x00 packet:

```
< 29.834  00 f3 e9 39 01 eb 03 a8 30 0c 01 00 00 01 16 83  | ≤Θ9☺δ♥¿0♀☺  ☺▬â|
          35 9b 41 07 80 3f 67 c9 24 68 50 29 c4 01 f1 03  |5¢A•Ç?g╔$hP)─☺±♥|
          9e 43 00 01 00 dc 81 01 00 c6 0d 00 86 72 01 eb  |₧C ☺ ▄ü☺ ╞↵ år☺δ|
          03 c7 0a 00 01 13 ad b8 d4 45 1b ac 43 f4 45 01  |♥╟◙ ☺‼¡╕╘E←¼C⌠E☺|
          e6 03 97 35 00 01 00 ba 6f 00 e2 01 00 bc 87 01  |µ♥ù5 ☺ ║o Γ☺ ╝ç☺|
          01 ed 03 f6 11 00 01 00 a2 70 00 8a 02 00 a8 81  |☺φ♥÷◄ ☺ óp è☻ ¿ü|
          01 01 f2 03 9d 1e 00 01 00 dc 83 01 03 a0 6f 01  |☺☺≥♥¥▲ ☺ ▄â☺♥áo☺|
          f0 03 ed 06 00 01 00 9c 84 01 00 8b 0e 00 80 7d  |≡♥φ♠ ☺ £ä☺ ï♫ Ç}|
          01 e7 03 a5 7c 00 01 00 92 7a 00 22 00 94 6a 01  |☺τ♥Ñ| ☺ Æz " öj☺|
          e9 03 81 1a 00 01 00 9e 74 03 be 73 01 ec 03 a4  |Θ♥ü→ ☺ ₧t♥╛s☺∞♥ñ|
          1c 00 01 00 e4 79 03 d4 74 01 ea 03 a9 58 00 01  |∟ ☺ Σy♥╘t☺Ω♥⌐X ☺|
          00 da 7d 03 8e 6e 01 ed 03 84 50 00 01 00 8a 88  | ┌}♥Än☺φ♥äP ☺ èê|
          01 03 ec 72 01                                   |☺♥∞r☺|   
 ```
 
This one we can fully parse and it means:
```js
var buffer = byteStringToBuffer("00 f3 e9 39 01 eb 03 a8 30  ... the rest ...")
var parser = new Parse(buffer)
console.log(parser.parseInbound())
```

 ```js
({ kind: 0,
  updateId: 947443,
  deletes: [ '491#6184' ],
  upcreates:
   [ { entityId: '1#0',
       updateKind: 2,
       agentPosY: 19.4011287689209,
       weirdBytes2: -947192,
       agentPosX: -677.25634765625 },
     { entityId: '497#8606',
       updateKind: 2,
       objPosY: 8302,
       objAngle: 867,
       objPosX: 7299 },
     { entityId: '491#1351',
       updateKind: 2,
       agentPosX2: 6807.08447265625,
       agentPosY2: 7816.458984375 },
     { entityId: '486#6807',
       updateKind: 2,
       objPosY: 7133,
       objAngle: 113,
       objPosX: 8670 },
     { entityId: '493#2294',
       updateKind: 2,
       objPosY: 7185,
       objAngle: 133,
       objPosX: 8276 },
     { entityId: '498#3869',
       updateKind: 2,
       objPosY: 8430,
       objPosX: 7120 },
     { entityId: '496#877',
       updateKind: 2,
       objPosY: 8462,
       objAngle: -902,
       objPosX: 8000 },
     { entityId: '487#15909',
       updateKind: 2,
       objPosY: 7817,
       objAngle: 17,
       objPosX: 6794 },
     { entityId: '489#3329',
       updateKind: 2,
       objPosY: 7439,
       objPosX: 7391 },
     { entityId: '492#3620',
       updateKind: 2,
       objPosY: 7794,
       objPosX: 7466 },
     { entityId: '490#11305',
       updateKind: 2,
       objPosY: 8045,
       objPosX: 7047 },
     { entityId: '493#10244',
       updateKind: 2,
       objPosY: 8709,
       objPosX: 7350 } ] })
```
 


 Credits go to CX for his [original work](https://github.com/cx88/diepssect) on the diep.io packet 
 reverse engineering. Some of his code has been borrowed here.
 
 
