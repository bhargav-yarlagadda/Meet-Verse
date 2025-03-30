'use client';

import { useEffect, useRef } from 'react';
import io  from 'socket.io-client';
import type { Socket } from 'socket.io-client';  // Correct type import for `Socket`
import type Phaser from 'phaser';

const GameCanvas = () => {
  const gameRef = useRef<Phaser.Game | null>(null);
  const socketRef = useRef<typeof Socket | null>(null);

  useEffect(() => {
    import('phaser').then((Phaser) => {
      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        width: window.innerWidth,
        height: window.innerHeight,
        parent: 'game-container',
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        scene: {
          preload,
          create,
          update,
        },
      };

      let player: Phaser.GameObjects.Sprite;
      let otherAvatars: Map<string, Phaser.GameObjects.Sprite> = new Map();
      let cursors: Phaser.Types.Input.Keyboard.CursorKeys;
      let avatarId: string;

      function preload(this: Phaser.Scene) {
        this.load.image('avatar', '/avatar_1.png');
      }

      function create(this: Phaser.Scene) {
        this.add.rectangle(
          window.innerWidth / 2,   // Center X
          window.innerHeight / 2,  // Center Y
          window.innerWidth - 20,  // Width
          window.innerHeight - 20, // Height
          0xeeeeee
        );

        player = this.add.sprite(
          window.innerWidth / 2,
          window.innerHeight / 2,
          'avatar'
        ).setDisplaySize(64, 60);

        cursors = this.input.keyboard!.createCursorKeys();

        // Initialize Socket.IO connection
        socketRef.current = io('http://localhost:8080');
        socketRef.current.on('connect', () => {
          console.log('Connected to Socket.IO');
        });

        socketRef.current.on('init', (data: { avatarId: string }) => {
          avatarId = data.avatarId;
        });

        socketRef.current.on('position', (data: { avatarId: string; x: number; y: number }) => {
          if (data.avatarId !== avatarId) {
            if (!otherAvatars.has(data.avatarId)) {
              otherAvatars.set(
                data.avatarId,
                this.add.sprite(data.x, data.y, 'avatar').setDisplaySize(64, 60)
              );
            } else {
              const avatar = otherAvatars.get(data.avatarId)!;
              avatar.x = data.x;
              avatar.y = data.y;
            }
          }
        });

        socketRef.current.on('remove', (data: { avatarId: string }) => {
          const avatar = otherAvatars.get(data.avatarId);
          if (avatar) {
            avatar.destroy();
            otherAvatars.delete(data.avatarId);
          }
        });
      }

      function update(this: Phaser.Scene) {
        const speed = 4;
        if (cursors.left.isDown) player.x -= speed;
        if (cursors.right.isDown) player.x += speed;
        if (cursors.up.isDown) player.y -= speed;
        if (cursors.down.isDown) player.y += speed;
        player.x = Phaser.Math.Clamp(player.x, 25, window.innerWidth - 25);
        player.y = Phaser.Math.Clamp(player.y, 25, window.innerHeight - 25);

        // Send player position to server
        if (socketRef.current?.connected) {
          socketRef.current.emit('position', {
            avatarId,
            x: player.x,
            y: player.y,
          });
        }
      }

      const game = new Phaser.Game(config);
      gameRef.current = game;

      return () => {
        game.destroy(true);
        if (socketRef.current) socketRef.current.disconnect();
      };
    });

    // Cleanup on unmount
    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  return (
    <div
      id="game-container"
      className="absolute inset-0 w-screen h-screen overflow-hidden"
    />
  );
};

export default GameCanvas;
