/**
 * =========================================================================
 * MYTEE — StudyMyte's Interactive 3D Robot Mascot (Three.js Engine)
 * =========================================================================
 * Premium, cute, educational 3D character with articulated joints,
 * dynamic facial screen textures, audio-reactive mouth, animation states,
 * Floating Assistant Mode, and Full 3D Character Preview Mode.
 */

(function (window, document) {
  'use strict';

  if (!window.THREE) {
    console.warn('[MYTEE 3D] Three.js not found. 3D Mascot disabled.');
    return;
  }

  const THREE = window.THREE;

  // Global shared palette matching reference image
  const PALETTE = {
    whiteArmor: 0xf8fafc,
    whiteGloss: 0xffffff,
    darkOled: 0x090e18,
    cyanGlow: 0x00f0ff,
    electricBlue: 0x2563eb,
    deepBlue: 0x1d4ed8,
    darkBlue: 0x1e3a8a,
    scarfBlue: 0x2563eb,
    bookBlue: 0x1e40af,
    jointGray: 0x64748b,
    silverTrim: 0xcfd8dc,
    pinkBlush: '#ff69b4',
    screenText: '#00f0ff'
  };

  /**
   * Helper: create a high quality glossy plastic/composite material
   */
  function createArmorMaterial(color = PALETTE.whiteArmor, roughness = 0.2, metalness = 0.08) {
    return new THREE.MeshStandardMaterial({
      color: color,
      roughness: roughness,
      metalness: metalness,
      roughnessMap: null
    });
  }

  function createGlowMaterial(color = PALETTE.cyanGlow, intensity = 1.0) {
    return new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: intensity,
      roughness: 0.2,
      metalness: 0.1
    });
  }

  /**
   * Generates the dynamic Canvas texture for MYTEE's digital face visor
   */
  class VisorFaceTexture {
    constructor() {
      this.canvas = document.createElement('canvas');
      this.canvas.width = 512;
      this.canvas.height = 256;
      this.ctx = this.canvas.getContext('2d');
      this.texture = new THREE.CanvasTexture(this.canvas);
      this.texture.minFilter = THREE.LinearFilter;
      this.texture.magFilter = THREE.LinearFilter;

      // Expression parameters
      this.eyeState = 'happy'; // 'happy', 'idle', 'thinking', 'sleep', 'error', 'surprised'
      this.blinkAmount = 0;    // 0 = open, 1 = closed
      this.mouthOpen = 0.35;   // 0 = closed line, 1 = wide open smile
      this.mouthWidth = 0.8;
      this.lookX = 0;          // -1 to 1
      this.lookY = 0;          // -1 to 1
      this.blushOpacity = 0.9;
      this.antennaPulse = 1.0;

      this.updateCanvas();
    }

    updateCanvas() {
      const ctx = this.ctx;
      const w = this.canvas.width;
      const h = this.canvas.height;

      // OLED dark display background
      ctx.fillStyle = '#080d19';
      ctx.fillRect(0, 0, w, h);

      // Subtle curved display glass scanlines / grid
      ctx.fillStyle = 'rgba(0, 240, 255, 0.025)';
      for (let y = 0; y < h; y += 8) {
        ctx.fillRect(0, y, w, 2);
      }

      const leftEyeX = 160 + this.lookX * 24;
      const rightEyeX = 352 + this.lookX * 24;
      const eyeY = 110 + this.lookY * 18;

      ctx.save();
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 18;
      ctx.strokeStyle = '#00f0ff';
      ctx.fillStyle = '#00f0ff';
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // 1. Draw Eyes based on state & blink
      if (this.blinkAmount > 0.85 || this.eyeState === 'sleep') {
        // Closed sleeping/blinking curved lines: ⌒ ⌒
        this.drawCurvedLine(ctx, leftEyeX - 32, eyeY, leftEyeX + 32, eyeY, -16);
        this.drawCurvedLine(ctx, rightEyeX - 32, eyeY, rightEyeX + 32, eyeY, -16);
      } else if (this.eyeState === 'happy') {
        // Bright smiling happy arcs ^ ^ from reference image
        const smileScale = 1 - this.blinkAmount;
        ctx.lineWidth = 15;
        this.drawHappyEyeArc(ctx, leftEyeX, eyeY + 4, 38, smileScale);
        this.drawHappyEyeArc(ctx, rightEyeX, eyeY + 4, 38, smileScale);
      } else if (this.eyeState === 'thinking') {
        // Looking up-right with curious expression
        ctx.beginPath();
        ctx.ellipse(leftEyeX + 10, eyeY - 14, 18, 24 * (1 - this.blinkAmount), 0, 0, Math.PI * 2);
        ctx.ellipse(rightEyeX + 10, eyeY - 14, 18, 24 * (1 - this.blinkAmount), 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (this.eyeState === 'error') {
        // Concerned / wavy eyes
        ctx.lineWidth = 12;
        ctx.beginPath();
        ctx.moveTo(leftEyeX - 30, eyeY - 10);
        ctx.lineTo(leftEyeX + 30, eyeY + 10);
        ctx.moveTo(rightEyeX - 30, eyeY + 10);
        ctx.lineTo(rightEyeX + 30, eyeY - 10);
        ctx.stroke();
      } else {
        // Normal open pill eyes
        const eyeHeight = Math.max(4, 28 * (1 - this.blinkAmount));
        ctx.beginPath();
        ctx.ellipse(leftEyeX, eyeY, 18, eyeHeight, 0, 0, Math.PI * 2);
        ctx.ellipse(rightEyeX, eyeY, 18, eyeHeight, 0, 0, Math.PI * 2);
        ctx.fill();

        // Inner pupil sparkle
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(leftEyeX - 5, eyeY - 6, 5, 0, Math.PI * 2);
        ctx.arc(rightEyeX - 5, eyeY - 6, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // 2. Draw Mouth
      ctx.save();
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 14;
      ctx.fillStyle = '#00f0ff';
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';

      const mouthCenterX = 256 + this.lookX * 10;
      const mouthY = 176 + this.lookY * 6;

      if (this.eyeState === 'sleep') {
        // Tiny relaxed mouth line
        ctx.beginPath();
        ctx.moveTo(mouthCenterX - 14, mouthY);
        ctx.lineTo(mouthCenterX + 14, mouthY);
        ctx.stroke();
      } else if (this.mouthOpen > 0.25) {
        // Open cute smile from reference
        const openH = Math.max(8, this.mouthOpen * 26);
        ctx.beginPath();
        ctx.moveTo(mouthCenterX - 28, mouthY - 4);
        ctx.quadraticCurveTo(mouthCenterX, mouthY + openH, mouthCenterX + 28, mouthY - 4);
        ctx.closePath();
        ctx.fill();
      } else {
        // Closed happy curve smile
        ctx.beginPath();
        ctx.moveTo(mouthCenterX - 22, mouthY - 2);
        ctx.quadraticCurveTo(mouthCenterX, mouthY + 14, mouthCenterX + 22, mouthY - 2);
        ctx.stroke();
      }
      ctx.restore();

      // 3. Pink Anime Blush Marks (///) on cheeks
      if (this.blushOpacity > 0.05) {
        ctx.save();
        ctx.strokeStyle = '#ff69b4';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.globalAlpha = this.blushOpacity;

        // Left blush (///)
        const lbX = 85 + this.lookX * 14;
        const bY = 152 + this.lookY * 10;
        ctx.beginPath();
        ctx.moveTo(lbX, bY - 8); ctx.lineTo(lbX + 8, bY + 8);
        ctx.moveTo(lbX + 12, bY - 8); ctx.lineTo(lbX + 20, bY + 8);
        ctx.moveTo(lbX + 24, bY - 8); ctx.lineTo(lbX + 32, bY + 8);
        ctx.stroke();

        // Right blush (///)
        const rbX = 395 + this.lookX * 14;
        ctx.beginPath();
        ctx.moveTo(rbX, bY - 8); ctx.lineTo(rbX + 8, bY + 8);
        ctx.moveTo(rbX + 12, bY - 8); ctx.lineTo(rbX + 20, bY + 8);
        ctx.moveTo(rbX + 24, bY - 8); ctx.lineTo(rbX + 32, bY + 8);
        ctx.stroke();

        ctx.restore();
      }

      this.texture.needsUpdate = true;
    }

    drawHappyEyeArc(ctx, x, y, radius, scaleY) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y + 10, radius, Math.PI * 1.15, Math.PI * 1.85, false);
      ctx.scale(1, Math.max(0.1, scaleY));
      ctx.stroke();
      ctx.restore();
    }

    drawCurvedLine(ctx, x1, y1, x2, y2, bend) {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.quadraticCurveTo((x1 + x2) / 2, y1 + bend, x2, y2);
      ctx.stroke();
    }
  }

  /**
   * Generates the dynamic Canvas texture for MYTEE's chest screen:
   * Glowing Book Icon + MYTEE + StudyMyte AI
   */
  function createChestDisplayTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 192;
    const ctx = canvas.getContext('2d');

    // Dark OLED background
    ctx.fillStyle = '#080d19';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Glowing cyan open book emblem
    ctx.save();
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 12;
    ctx.strokeStyle = '#00f0ff';
    ctx.fillStyle = '#00f0ff';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const cx = 128;
    const cy = 52;
    // Book left page
    ctx.beginPath();
    ctx.moveTo(cx, cy - 14);
    ctx.quadraticCurveTo(cx - 24, cy - 22, cx - 44, cy - 12);
    ctx.lineTo(cx - 44, cy + 16);
    ctx.quadraticCurveTo(cx - 24, cy + 6, cx, cy + 14);
    ctx.closePath();
    ctx.stroke();

    // Book right page
    ctx.beginPath();
    ctx.moveTo(cx, cy - 14);
    ctx.quadraticCurveTo(cx + 24, cy - 22, cx + 44, cy - 12);
    ctx.lineTo(cx + 44, cy + 16);
    ctx.quadraticCurveTo(cx + 24, cy + 6, cx, cy + 14);
    ctx.closePath();
    ctx.stroke();

    // Inner book spine line
    ctx.beginPath();
    ctx.moveTo(cx, cy - 14);
    ctx.lineTo(cx, cy + 14);
    ctx.stroke();

    // Typography: "MYTEE"
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 32px "Outfit", "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MYTEE', cx, 116);

    // Subtext: "StudyMyte AI"
    ctx.fillStyle = '#38bdf8';
    ctx.font = '700 15px "Outfit", "Inter", sans-serif';
    ctx.letterSpacing = '1px';
    ctx.fillText('StudyMyte AI', cx, 146);

    ctx.restore();

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return texture;
  }

  /**
   * Generates the dynamic Ear Headphone Book Texture
   */
  function createEarBookTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 128, 128);

    // Cyan glowing open book
    ctx.save();
    ctx.strokeStyle = '#2563eb';
    ctx.fillStyle = '#2563eb';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const cx = 64;
    const cy = 64;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 18);
    ctx.quadraticCurveTo(cx - 24, cy - 28, cx - 38, cy - 18);
    ctx.lineTo(cx - 38, cy + 20);
    ctx.quadraticCurveTo(cx - 24, cy + 10, cx, cy + 20);
    ctx.closePath();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx, cy - 18);
    ctx.quadraticCurveTo(cx + 24, cy - 28, cx + 38, cy - 18);
    ctx.lineTo(cx + 38, cy + 20);
    ctx.quadraticCurveTo(cx + 24, cy + 10, cx, cy + 20);
    ctx.closePath();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx, cy - 18);
    ctx.lineTo(cx, cy + 20);
    ctx.stroke();

    ctx.restore();

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  /**
   * Procedural 3D Character Model for MYTEE
   * Faithfully builds the character from the reference photo.
   */
  class MyteeCharacter3D {
    constructor() {
      this.group = new THREE.Group();
      this.group.name = 'MYTEE_Robot_Mascot';

      this.materials = {
        whiteArmor: createArmorMaterial(PALETTE.whiteArmor, 0.15, 0.08),
        whiteGloss: createArmorMaterial(PALETTE.whiteGloss, 0.1, 0.1),
        darkOled: new THREE.MeshStandardMaterial({ color: PALETTE.darkOled, roughness: 0.2, metalness: 0.3 }),
        electricBlue: new THREE.MeshStandardMaterial({ color: PALETTE.electricBlue, roughness: 0.3, metalness: 0.1 }),
        deepBlue: new THREE.MeshStandardMaterial({ color: PALETTE.deepBlue, roughness: 0.4 }),
        cyanGlow: createGlowMaterial(PALETTE.cyanGlow, 1.4),
        jointGray: new THREE.MeshStandardMaterial({ color: PALETTE.jointGray, roughness: 0.5, metalness: 0.4 }),
        silverTrim: new THREE.MeshStandardMaterial({ color: PALETTE.silverTrim, roughness: 0.25, metalness: 0.7 })
      };

      this.visorTexture = new VisorFaceTexture();
      this.chestTexture = createChestDisplayTexture();
      this.earTexture = createEarBookTexture();

      this.bones = {};
      this.buildModel();
    }

    buildModel() {
      // Root Mascot Anchor
      const character = new THREE.Group();
      this.characterGroup = character;
      this.group.add(character);

      // =====================================================================
      // 1. TORSO & CHEST
      // =====================================================================
      const torsoGroup = new THREE.Group();
      torsoGroup.position.y = 1.35;
      this.bones.torso = torsoGroup;
      character.add(torsoGroup);

      // Torso main body (rounded white capsule chassis)
      const torsoGeo = new THREE.CylinderGeometry(0.52, 0.48, 0.72, 32);
      torsoGeo.scale(1, 1, 0.85);
      const torsoMesh = new THREE.Mesh(torsoGeo, this.materials.whiteArmor);
      torsoMesh.castShadow = true;
      torsoMesh.receiveShadow = true;
      torsoGroup.add(torsoMesh);

      // Chest Screen Display with MYTEE & Book Logo
      const chestDisplayMat = new THREE.MeshBasicMaterial({
        map: this.chestTexture,
        transparent: false
      });
      const chestGeo = new THREE.PlaneGeometry(0.55, 0.42);
      const chestMesh = new THREE.Mesh(chestGeo, chestDisplayMat);
      chestMesh.position.set(0, 0.04, 0.44);
      torsoGroup.add(chestMesh);

      // Chest Bezel
      const bezelGeo = new THREE.BoxGeometry(0.58, 0.45, 0.04);
      const bezelMesh = new THREE.Mesh(bezelGeo, this.materials.electricBlue);
      bezelMesh.position.set(0, 0.04, 0.42);
      torsoGroup.add(bezelMesh);

      // =====================================================================
      // 2. BLUE SCARF & COLLAR
      // =====================================================================
      const scarfGroup = new THREE.Group();
      scarfGroup.position.y = 0.42;
      torsoGroup.add(scarfGroup);

      // Scarf ring around neck
      const scarfRingGeo = new THREE.TorusGeometry(0.48, 0.09, 16, 32);
      scarfRingGeo.rotation.x = Math.PI / 2;
      const scarfRingMesh = new THREE.Mesh(scarfRingGeo, this.materials.electricBlue);
      scarfGroup.add(scarfRingMesh);

      // Trailing Scarf tail blowing to the side
      const scarfTailGeo = new THREE.BoxGeometry(0.18, 0.48, 0.04);
      scarfTailGeo.rotateZ(0.35);
      const scarfTailMesh = new THREE.Mesh(scarfTailGeo, this.materials.electricBlue);
      scarfTailMesh.position.set(0.46, -0.16, 0.15);
      scarfGroup.add(scarfTailMesh);
      this.bones.scarfTail = scarfTailMesh;

      // =====================================================================
      // 3. HEAD & HELMET
      // =====================================================================
      const headGroup = new THREE.Group();
      headGroup.position.set(0, 0.72, 0);
      this.bones.head = headGroup;
      torsoGroup.add(headGroup);

      // Main Helmet Sphere / Capsule
      const helmetGeo = new THREE.SphereGeometry(0.68, 32, 24);
      helmetGeo.scale(1.05, 0.95, 0.98);
      const helmetMesh = new THREE.Mesh(helmetGeo, this.materials.whiteArmor);
      helmetMesh.castShadow = true;
      headGroup.add(helmetMesh);

      // Glossy OLED Dark Visor Screen Face
      const visorGeo = new THREE.SphereGeometry(0.64, 32, 24, 0, Math.PI * 0.9, Math.PI * 0.2, Math.PI * 0.6);
      visorGeo.scale(1.04, 0.92, 0.99);
      visorGeo.rotation.y = Math.PI * 0.55;
      visorGeo.position.set(0, 0, 0.02);

      const visorMat = new THREE.MeshBasicMaterial({
        map: this.visorTexture.texture,
        transparent: false
      });
      const visorMesh = new THREE.Mesh(visorGeo, visorMat);
      headGroup.add(visorMesh);

      // Top Antenna Stalk & Glowing Beacon
      const antennaGroup = new THREE.Group();
      antennaGroup.position.set(0, 0.65, -0.05);
      headGroup.add(antennaGroup);
      this.bones.antenna = antennaGroup;

      const stalkCurve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0.16, -0.05),
        new THREE.Vector3(0, 0.28, -0.12)
      );
      const stalkGeo = new THREE.TubeGeometry(stalkCurve, 12, 0.024, 12, false);
      const stalkMesh = new THREE.Mesh(stalkGeo, this.materials.jointGray);
      antennaGroup.add(stalkMesh);

      // Glowing Cyan Antenna Tip
      const orbGeo = new THREE.SphereGeometry(0.065, 16, 16);
      const orbMesh = new THREE.Mesh(orbGeo, this.materials.cyanGlow);
      orbMesh.position.set(0, 0.28, -0.12);
      antennaGroup.add(orbMesh);
      this.antennaOrb = orbMesh;

      // Circular Headphones / Ear Modules (Left & Right)
      const earGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.12, 28);
      earGeo.rotateZ(Math.PI / 2);

      const earPlateGeo = new THREE.CircleGeometry(0.22, 28);
      const earPlateMat = new THREE.MeshBasicMaterial({ map: this.earTexture });

      // Right Ear
      const rightEarGroup = new THREE.Group();
      rightEarGroup.position.set(0.68, 0.04, 0);
      const rightEarMesh = new THREE.Mesh(earGeo, this.materials.whiteArmor);
      rightEarGroup.add(rightEarMesh);

      const rPlateMesh = new THREE.Mesh(earPlateGeo, earPlateMat);
      rPlateMesh.position.set(0.065, 0, 0);
      rPlateMesh.rotation.y = Math.PI / 2;
      rightEarGroup.add(rPlateMesh);

      // Ear Wing/Fin (blue antenna fin)
      const finGeo = new THREE.ConeGeometry(0.08, 0.26, 12);
      finGeo.rotateX(-0.4);
      finGeo.rotateZ(-0.3);
      const rFin = new THREE.Mesh(finGeo, this.materials.electricBlue);
      rFin.position.set(0, 0.18, -0.14);
      rightEarGroup.add(rFin);
      headGroup.add(rightEarGroup);

      // Left Ear
      const leftEarGroup = new THREE.Group();
      leftEarGroup.position.set(-0.68, 0.04, 0);
      const leftEarMesh = new THREE.Mesh(earGeo, this.materials.whiteArmor);
      leftEarGroup.add(leftEarMesh);

      const lPlateMesh = new THREE.Mesh(earPlateGeo, earPlateMat);
      lPlateMesh.position.set(-0.065, 0, 0);
      lPlateMesh.rotation.y = -Math.PI / 2;
      leftEarGroup.add(lPlateMesh);

      const lFin = new THREE.Mesh(finGeo, this.materials.electricBlue);
      lFin.position.set(0, 0.18, -0.14);
      lFin.rotation.z = 0.6;
      leftEarGroup.add(lFin);
      headGroup.add(leftEarGroup);

      // =====================================================================
      // 4. RIGHT ARM (ARTICULATED WAVING ARM)
      // =====================================================================
      const rightArmGroup = new THREE.Group();
      rightArmGroup.position.set(0.56, 0.22, 0);
      this.bones.rightArm = rightArmGroup;
      torsoGroup.add(rightArmGroup);

      // Shoulder ball
      const shoulderGeo = new THREE.SphereGeometry(0.12, 16, 16);
      const rShoulderMesh = new THREE.Mesh(shoulderGeo, this.materials.jointGray);
      rightArmGroup.add(rShoulderMesh);

      // Upper arm
      const rUpperArmGeo = new THREE.CylinderGeometry(0.09, 0.08, 0.28, 16);
      rUpperArmGeo.translate(0, -0.14, 0);
      const rUpperArmMesh = new THREE.Mesh(rUpperArmGeo, this.materials.whiteArmor);
      rightArmGroup.add(rUpperArmMesh);

      // Forearm & Elbow Group
      const rForearmGroup = new THREE.Group();
      rForearmGroup.position.set(0, -0.28, 0);
      this.bones.rightForearm = rForearmGroup;
      rightArmGroup.add(rForearmGroup);

      const rElbow = new THREE.Mesh(shoulderGeo, this.materials.jointGray);
      rElbow.scale.set(0.8, 0.8, 0.8);
      rForearmGroup.add(rElbow);

      const rForearmGeo = new THREE.CylinderGeometry(0.1, 0.08, 0.28, 16);
      rForearmGeo.translate(0, -0.14, 0);
      const rForearmMesh = new THREE.Mesh(rForearmGeo, this.materials.whiteArmor);
      rForearmGroup.add(rForearmMesh);

      // Right Hand (Palm with glowing cyan palm repulsor)
      const rHandGroup = new THREE.Group();
      rHandGroup.position.set(0, -0.3, 0);
      this.bones.rightHand = rHandGroup;
      rForearmGroup.add(rHandGroup);

      const palmGeo = new THREE.BoxGeometry(0.14, 0.14, 0.06);
      const palmMesh = new THREE.Mesh(palmGeo, this.materials.whiteArmor);
      rHandGroup.add(palmMesh);

      // Glowing Palm Core Light (from reference image)
      const palmLightGeo = new THREE.CircleGeometry(0.038, 16);
      const palmLightMesh = new THREE.Mesh(palmLightGeo, this.materials.cyanGlow);
      palmLightMesh.position.set(0, 0, 0.032);
      rHandGroup.add(palmLightMesh);

      // Five articulated mechanical fingers
      const fingerGeo = new THREE.CylinderGeometry(0.016, 0.014, 0.09, 8);
      for (let i = 0; i < 4; i++) {
        const finger = new THREE.Mesh(fingerGeo, this.materials.jointGray);
        finger.position.set(-0.045 + i * 0.03, -0.11, 0);
        rHandGroup.add(finger);
      }
      // Thumb
      const thumb = new THREE.Mesh(fingerGeo, this.materials.jointGray);
      thumb.position.set(0.065, -0.05, 0);
      thumb.rotation.z = -0.6;
      rHandGroup.add(thumb);

      // Default reference pose: Raised arm waving!
      rightArmGroup.rotation.z = 1.35;
      rightArmGroup.rotation.x = -0.3;
      rForearmGroup.rotation.z = 0.85;

      // =====================================================================
      // 5. LEFT ARM & STUDY BOOK
      // =====================================================================
      const leftArmGroup = new THREE.Group();
      leftArmGroup.position.set(-0.56, 0.22, 0);
      this.bones.leftArm = leftArmGroup;
      torsoGroup.add(leftArmGroup);

      const lShoulderMesh = new THREE.Mesh(shoulderGeo, this.materials.jointGray);
      leftArmGroup.add(lShoulderMesh);

      const lUpperArmGeo = new THREE.CylinderGeometry(0.09, 0.08, 0.28, 16);
      lUpperArmGeo.translate(0, -0.14, 0);
      const lUpperArmMesh = new THREE.Mesh(lUpperArmGeo, this.materials.whiteArmor);
      leftArmGroup.add(lUpperArmMesh);

      const lForearmGroup = new THREE.Group();
      lForearmGroup.position.set(0, -0.28, 0);
      this.bones.leftForearm = lForearmGroup;
      leftArmGroup.add(lForearmGroup);

      const lElbow = new THREE.Mesh(shoulderGeo, this.materials.jointGray);
      lElbow.scale.set(0.8, 0.8, 0.8);
      lForearmGroup.add(lElbow);

      const lForearmGeo = new THREE.CylinderGeometry(0.1, 0.08, 0.26, 16);
      lForearmGeo.translate(0, -0.13, 0);
      const lForearmMesh = new THREE.Mesh(lForearmGeo, this.materials.whiteArmor);
      lForearmGroup.add(lForearmMesh);

      // Blue Academic Study Book tucked under left arm (from reference image)
      const bookGroup = new THREE.Group();
      bookGroup.position.set(-0.06, -0.22, 0.12);
      bookGroup.rotation.set(0.2, 0.35, -0.15);
      this.bones.book = bookGroup;
      lForearmGroup.add(bookGroup);

      // Book cover (blue)
      const bookCoverGeo = new THREE.BoxGeometry(0.34, 0.44, 0.07);
      const bookCoverMat = new THREE.MeshStandardMaterial({ color: PALETTE.bookBlue, roughness: 0.35 });
      const bookCoverMesh = new THREE.Mesh(bookCoverGeo, bookCoverMat);
      bookGroup.add(bookCoverMesh);

      // Book pages block (white)
      const pagesGeo = new THREE.BoxGeometry(0.3, 0.4, 0.055);
      const pagesMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.8 });
      const pagesMesh = new THREE.Mesh(pagesGeo, pagesMat);
      pagesMesh.position.x = 0.015;
      bookGroup.add(pagesMesh);

      // Cyan bookmark ribbon
      const bookmarkGeo = new THREE.BoxGeometry(0.05, 0.12, 0.01);
      const bookmarkMesh = new THREE.Mesh(bookmarkGeo, this.materials.cyanGlow);
      bookmarkMesh.position.set(0, -0.22, 0.038);
      bookGroup.add(bookmarkMesh);

      // Left arm resting comfortably holding the book
      leftArmGroup.rotation.z = -0.35;
      leftArmGroup.rotation.x = 0.25;
      lForearmGroup.rotation.y = 0.35;

      // =====================================================================
      // 6. LEGS & SCI-FI SNEAKER BOOTS
      // =====================================================================
      // Hip Pelvis connection
      const pelvisGeo = new THREE.CylinderGeometry(0.38, 0.34, 0.18, 24);
      const pelvisMesh = new THREE.Mesh(pelvisGeo, this.materials.jointGray);
      pelvisMesh.position.y = -0.42;
      torsoGroup.add(pelvisMesh);

      // Right Leg Group
      const rightLegGroup = new THREE.Group();
      rightLegGroup.position.set(0.26, -0.45, 0);
      this.bones.rightLeg = rightLegGroup;
      torsoGroup.add(rightLegGroup);

      const thighGeo = new THREE.CylinderGeometry(0.12, 0.1, 0.32, 16);
      thighGeo.translate(0, -0.16, 0);
      const rThigh = new THREE.Mesh(thighGeo, this.materials.whiteArmor);
      rightLegGroup.add(rThigh);

      // Knee joint with blue armor accent
      const kneeGeo = new THREE.SphereGeometry(0.11, 16, 16);
      const rKnee = new THREE.Mesh(kneeGeo, this.materials.electricBlue);
      rKnee.position.set(0, -0.32, 0.02);
      rightLegGroup.add(rKnee);

      // Shin with glowing vertical cyan accent slit
      const shinGeo = new THREE.CylinderGeometry(0.13, 0.11, 0.38, 16);
      shinGeo.translate(0, -0.52, 0);
      const rShin = new THREE.Mesh(shinGeo, this.materials.whiteArmor);
      rightLegGroup.add(rShin);

      const slitGeo = new THREE.BoxGeometry(0.03, 0.22, 0.03);
      const rSlit = new THREE.Mesh(slitGeo, this.materials.cyanGlow);
      rSlit.position.set(0, -0.52, 0.12);
      rightLegGroup.add(rSlit);

      // Right Foot (Futuristic sneaker with blue sole & blue toe cap)
      const footGeo = new THREE.BoxGeometry(0.24, 0.13, 0.44);
      footGeo.translate(0, -0.73, 0.07);
      const rFoot = new THREE.Mesh(footGeo, this.materials.whiteArmor);
      rightLegGroup.add(rFoot);

      const soleGeo = new THREE.BoxGeometry(0.26, 0.04, 0.46);
      soleGeo.translate(0, -0.79, 0.07);
      const rSole = new THREE.Mesh(soleGeo, this.materials.electricBlue);
      rightLegGroup.add(rSole);

      // Left Leg Group
      const leftLegGroup = new THREE.Group();
      leftLegGroup.position.set(-0.26, -0.45, 0);
      this.bones.leftLeg = leftLegGroup;
      torsoGroup.add(leftLegGroup);

      const lThigh = new THREE.Mesh(thighGeo, this.materials.whiteArmor);
      leftLegGroup.add(lThigh);

      const lKnee = new THREE.Mesh(kneeGeo, this.materials.electricBlue);
      lKnee.position.set(0, -0.32, 0.02);
      leftLegGroup.add(lKnee);

      const lShin = new THREE.Mesh(shinGeo, this.materials.whiteArmor);
      leftLegGroup.add(lShin);

      const lSlit = new THREE.Mesh(slitGeo, this.materials.cyanGlow);
      lSlit.position.set(0, -0.52, 0.12);
      leftLegGroup.add(lSlit);

      const lFoot = new THREE.Mesh(footGeo, this.materials.whiteArmor);
      leftLegGroup.add(lFoot);

      const lSole = new THREE.Mesh(soleGeo, this.materials.electricBlue);
      leftLegGroup.add(lSole);

      // =====================================================================
      // 7. SCI-FI CIRCULAR PEDESTAL PLATFORM (From reference image)
      // =====================================================================
      const pedestalGroup = new THREE.Group();
      pedestalGroup.position.set(0, 0.02, 0);
      this.pedestal = pedestalGroup;
      this.group.add(pedestalGroup);

      // Metal base bevel
      const platformGeo = new THREE.CylinderGeometry(1.5, 1.65, 0.16, 48);
      const platformMesh = new THREE.Mesh(platformGeo, this.materials.silverTrim);
      platformMesh.receiveShadow = true;
      pedestalGroup.add(platformMesh);

      // Outer glowing cyan LED ring
      const outerRingGeo = new THREE.TorusGeometry(1.38, 0.035, 16, 48);
      outerRingGeo.rotation.x = Math.PI / 2;
      const outerRingMesh = new THREE.Mesh(outerRingGeo, this.materials.cyanGlow);
      outerRingMesh.position.y = 0.09;
      pedestalGroup.add(outerRingMesh);

      // Inner glowing cyan LED ring
      const innerRingGeo = new THREE.TorusGeometry(0.85, 0.03, 16, 48);
      innerRingGeo.rotation.x = Math.PI / 2;
      const innerRingMesh = new THREE.Mesh(innerRingGeo, this.materials.cyanGlow);
      innerRingMesh.position.y = 0.09;
      pedestalGroup.add(innerRingMesh);
    }

    /**
     * Updates character procedural animations every frame
     */
    update(time, delta, state, audioLevel = 0) {
      const b = this.bones;
      if (!b.torso || !b.head) return;

      // 1. Natural Blinking logic
      const blinkCycle = time % 4.8;
      if (blinkCycle < 0.16) {
        this.visorTexture.blinkAmount = Math.sin((blinkCycle / 0.16) * Math.PI);
      } else {
        this.visorTexture.blinkAmount = 0;
      }

      // 2. Pulse antenna tip
      if (this.antennaOrb) {
        const pulse = 1.0 + Math.sin(time * 3.5) * 0.4;
        this.antennaOrb.scale.set(pulse, pulse, pulse);
      }

      // 3. State-based skeletal animations
      switch (state) {
        case 'greeting': {
          this.visorTexture.eyeState = 'happy';
          this.visorTexture.mouthOpen = 0.4 + Math.sin(time * 6) * 0.2;
          this.visorTexture.blushOpacity = 0.95;

          // Enthusiastic arm waving
          if (b.rightArm && b.rightForearm) {
            b.rightArm.rotation.z = 1.45 + Math.sin(time * 7) * 0.25;
            b.rightForearm.rotation.z = 0.85 + Math.sin(time * 7 + 0.5) * 0.2;
            b.rightHand.rotation.z = Math.sin(time * 8) * 0.35;
          }
          // Slight happy head tilt
          b.head.rotation.z = Math.sin(time * 3) * 0.08;
          b.head.rotation.y = Math.sin(time * 2) * 0.1;
          b.torso.position.y = 1.35 + Math.sin(time * 4) * 0.03;
          break;
        }

        case 'thinking': {
          this.visorTexture.eyeState = 'thinking';
          this.visorTexture.mouthOpen = 0.15;
          this.visorTexture.lookX = 0.6;
          this.visorTexture.lookY = -0.5;

          // Hand taps chin
          if (b.rightArm && b.rightForearm) {
            b.rightArm.rotation.z = 1.1;
            b.rightArm.rotation.x = -0.6;
            b.rightForearm.rotation.z = 1.4;
          }
          // Head tilted curiously
          b.head.rotation.z = -0.16;
          b.head.rotation.y = 0.2;
          b.torso.position.y = 1.35;
          break;
        }

        case 'speaking': {
          this.visorTexture.eyeState = 'happy';
          // Mouth reacts to real audio or procedural phonemes
          const mouthActivity = audioLevel > 0.02 ? audioLevel * 2.2 : (0.3 + Math.abs(Math.sin(time * 12)) * 0.6);
          this.visorTexture.mouthOpen = Math.min(1.0, mouthActivity);
          this.visorTexture.blushOpacity = 0.8;

          // Conversational hand gestures
          if (b.rightArm && b.rightForearm) {
            b.rightArm.rotation.z = 0.8 + Math.sin(time * 4) * 0.2;
            b.rightForearm.rotation.z = 0.7 + Math.sin(time * 6) * 0.25;
          }
          b.head.rotation.y = Math.sin(time * 3) * 0.12;
          b.head.rotation.x = Math.sin(time * 4) * 0.06;
          b.torso.position.y = 1.35 + Math.sin(time * 6) * 0.02;
          break;
        }

        case 'happy': {
          this.visorTexture.eyeState = 'happy';
          this.visorTexture.mouthOpen = 0.8;
          this.visorTexture.blushOpacity = 1.0;

          // Excited bounce
          const jump = Math.abs(Math.sin(time * 8)) * 0.18;
          b.torso.position.y = 1.35 + jump;
          b.head.rotation.z = Math.sin(time * 6) * 0.12;
          if (b.rightArm) {
            b.rightArm.rotation.z = 1.6 + Math.sin(time * 8) * 0.2;
          }
          break;
        }

        case 'error': {
          this.visorTexture.eyeState = 'error';
          this.visorTexture.mouthOpen = 0.05;
          this.visorTexture.blushOpacity = 0.2;
          b.head.rotation.y = Math.sin(time * 5) * 0.18;
          b.head.rotation.z = 0;
          if (b.rightArm) {
            b.rightArm.rotation.z = 0.4;
          }
          break;
        }

        case 'sleep': {
          this.visorTexture.eyeState = 'sleep';
          this.visorTexture.mouthOpen = 0.0;
          this.visorTexture.blushOpacity = 0.1;
          b.head.rotation.x = 0.18;
          b.head.rotation.z = 0.08;
          b.torso.position.y = 1.35 + Math.sin(time * 1.5) * 0.015;
          if (b.rightArm) {
            b.rightArm.rotation.z = 0.3;
          }
          break;
        }

        case 'idle':
        default: {
          this.visorTexture.eyeState = 'happy';
          this.visorTexture.mouthOpen = 0.35 + Math.sin(time * 2.5) * 0.1;
          this.visorTexture.blushOpacity = 0.75;

          // Gentle breathing and floating
          b.torso.position.y = 1.35 + Math.sin(time * 2.2) * 0.04;

          // Subtle natural eye look around
          const lookCycle = (time * 0.4) % 6;
          if (lookCycle < 1.5) {
            this.visorTexture.lookX = THREE.MathUtils.lerp(this.visorTexture.lookX, 0.4, 0.1);
          } else if (lookCycle < 3.0) {
            this.visorTexture.lookX = THREE.MathUtils.lerp(this.visorTexture.lookX, -0.4, 0.1);
          } else {
            this.visorTexture.lookX = THREE.MathUtils.lerp(this.visorTexture.lookX, 0, 0.1);
          }

          // Gentle greeting wave in default pose
          if (b.rightArm && b.rightForearm) {
            b.rightArm.rotation.z = 1.35 + Math.sin(time * 3.5) * 0.15;
            b.rightForearm.rotation.z = 0.85 + Math.sin(time * 4) * 0.12;
            b.rightHand.rotation.z = Math.sin(time * 4.5) * 0.18;
          }

          b.head.rotation.y = Math.sin(time * 1.4) * 0.08;
          b.head.rotation.z = Math.sin(time * 1.8) * 0.04;
          break;
        }
      }

      // Update scarf flutter
      if (b.scarfTail) {
        b.scarfTail.rotation.z = 0.35 + Math.sin(time * 3.8) * 0.08;
      }

      // Redraw Visor canvas
      this.visorTexture.updateCanvas();
    }
  }

  /**
   * Main MYTEE 3D Controller
   * Coordinates Floating Assistant Mode, 3D Character Preview Mode,
   * audio integration, and animation state management.
   */
  class Mytee3DManager {
    constructor() {
      this.character = null;
      this.state = 'idle';
      this.clock = new THREE.Clock();

      // Floating canvas references
      this.floatCanvas = null;
      this.floatRenderer = null;
      this.floatScene = null;
      this.floatCamera = null;

      // Preview modal references
      this.previewModal = null;
      this.previewCanvas = null;
      this.previewRenderer = null;
      this.previewScene = null;
      this.previewCamera = null;
      this.isPreviewOpen = false;

      // Audio analysis
      this.audioContext = null;
      this.analyser = null;
      this.audioData = null;

      // Mouse tracking
      this.mouse = { x: 0, y: 0 };
      this.isDraggingPreview = false;
      this.previewRotX = 0;
      this.previewRotY = 0;

      this.init();
    }

    init() {
      // 1. Build the 3D Character
      this.character = new MyteeCharacter3D();

      // 2. Setup Floating Mode
      this.setupFloatingMode();

      // 3. Setup Character Preview Modal
      this.setupPreviewModal();

      // 4. Bind Audio & Conversation Events
      this.bindChatEvents();

      // 5. Start Render Animation Loop
      this.animate = this.animate.bind(this);
      requestAnimationFrame(this.animate);

      // Listen for window resize
      window.addEventListener('resize', () => this.onResize());
    }

    /**
     * A. Floating Assistant Mode Setup
     */
    setupFloatingMode() {
      const container = document.getElementById('mytee-robot-figure');
      if (!container) return;

      // Replace or augment container with WebGL canvas
      container.innerHTML = '';
      const canvas = document.createElement('canvas');
      canvas.id = 'mytee-3d-floating-canvas';
      canvas.width = 160;
      canvas.height = 180;
      canvas.style.width = '80px';
      canvas.style.height = '90px';
      canvas.style.display = 'block';
      canvas.style.cursor = 'grab';
      canvas.addEventListener('click', (e) => {
        if (typeof window.toggleMyteeDrawer === 'function') {
          window.toggleMyteeDrawer();
        }
      });
      container.appendChild(canvas);
      this.floatCanvas = canvas;

      // Scene & Camera
      this.floatScene = new THREE.Scene();
      this.floatCamera = new THREE.PerspectiveCamera(42, 160 / 180, 0.1, 50);
      this.floatCamera.position.set(0, 1.4, 3.8);
      this.floatCamera.lookAt(0, 1.35, 0);

      // Studio Lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
      this.floatScene.add(ambientLight);

      const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
      dirLight.position.set(3, 5, 4);
      this.floatScene.add(dirLight);

      const cyanRim = new THREE.DirectionalLight(0x00f0ff, 0.9);
      cyanRim.position.set(-3, 2, -2);
      this.floatScene.add(cyanRim);

      // Add character to scene
      this.floatScene.add(this.character.group);

      // WebGL Renderer
      try {
        this.floatRenderer = new THREE.WebGLRenderer({
          canvas: this.floatCanvas,
          alpha: true,
          antialias: true,
          powerPreference: 'high-performance'
        });
        this.floatRenderer.setSize(160, 180, false);
        this.floatRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      } catch (err) {
        console.warn('[MYTEE 3D] WebGL not supported, falling back.', err);
      }

      // Add "3D Preview" inspect pill right next to launcher
      this.injectPreviewInspectButton();
    }

    injectPreviewInspectButton() {
      const launcher = document.getElementById('mytee-launcher');
      if (!launcher || document.getElementById('mytee-btn-inspect-3d')) return;

      const btn = document.createElement('div');
      btn.id = 'mytee-btn-inspect-3d';
      btn.setAttribute('role', 'button');
      btn.setAttribute('tabindex', '0');
      btn.title = 'Open 3D Character Inspector & Mascot Studio';
      btn.className = 'mytee-inspect-pill';
      btn.innerHTML = '<span>3D View</span>';
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openPreviewMode();
      });

      launcher.appendChild(btn);
    }

    /**
     * B. Full-body Character Preview Mode Modal Setup
     */
    setupPreviewModal() {
      if (document.getElementById('mytee-preview-modal')) return;

      const modal = document.createElement('div');
      modal.id = 'mytee-preview-modal';
      modal.className = 'mytee-preview-modal mytee-preview-hidden';
      modal.innerHTML = `
        <div class="mytee-preview-card">
          <div class="mytee-preview-header">
            <div class="mytee-preview-title">
              <span class="preview-badge">3D Studio</span>
              <h3>MYTEE Interactive Mascot</h3>
            </div>
            <button id="mytee-preview-close" class="mytee-preview-close-btn" title="Close 3D View">✕</button>
          </div>
          
          <div class="mytee-preview-canvas-wrap" id="mytee-preview-canvas-wrap">
            <canvas id="mytee-3d-preview-canvas"></canvas>
            <div class="mytee-drag-hint">Drag to rotate 360° • Scroll to zoom</div>
          </div>

          <!-- State Controls -->
          <div class="mytee-preview-footer">
            <div class="mytee-state-pills">
              <button class="state-btn active" data-state="greeting">👋 Greeting</button>
              <button class="state-btn" data-state="idle">🧘 Idle</button>
              <button class="state-btn" data-state="thinking">💡 Thinking</button>
              <button class="state-btn" data-state="speaking">💬 Speaking</button>
              <button class="state-btn" data-state="happy">🎉 Happy</button>
              <button class="state-btn" data-state="error">❌ Error</button>
              <button class="state-btn" data-state="sleep">💤 Sleep</button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(modal);
      this.previewModal = modal;
      this.previewCanvas = document.getElementById('mytee-3d-preview-canvas');

      // Setup 3D Preview Scene & Renderer
      this.previewScene = new THREE.Scene();
      this.previewCamera = new THREE.PerspectiveCamera(40, 600 / 500, 0.1, 50);
      this.previewCamera.position.set(0, 1.3, 4.4);
      this.previewCamera.lookAt(0, 1.1, 0);

      // Studio Lighting for Preview
      const amb = new THREE.AmbientLight(0xffffff, 0.9);
      this.previewScene.add(amb);

      const dir = new THREE.DirectionalLight(0xffffff, 1.4);
      dir.position.set(4, 6, 5);
      dir.castShadow = true;
      this.previewScene.add(dir);

      const blueBack = new THREE.DirectionalLight(0x00f0ff, 1.2);
      blueBack.position.set(-4, 3, -3);
      this.previewScene.add(blueBack);

      try {
        this.previewRenderer = new THREE.WebGLRenderer({
          canvas: this.previewCanvas,
          alpha: true,
          antialias: true
        });
        this.previewRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      } catch (e) {
        console.warn(e);
      }

      // Bind modal buttons & interactions
      const closeBtn = document.getElementById('mytee-preview-close');
      if (closeBtn) closeBtn.addEventListener('click', () => this.closePreviewMode());

      // State selector buttons
      const stateBtns = modal.querySelectorAll('.state-btn');
      stateBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
          stateBtns.forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          const nextState = btn.getAttribute('data-state');
          this.setState(nextState);
        });
      });

      // Drag to rotate preview
      const wrap = document.getElementById('mytee-preview-canvas-wrap');
      if (wrap) {
        let isDown = false;
        let prevX = 0;
        let prevY = 0;

        wrap.addEventListener('pointerdown', (e) => {
          isDown = true;
          prevX = e.clientX;
          prevY = e.clientY;
          wrap.setPointerCapture(e.pointerId);
        });

        wrap.addEventListener('pointermove', (e) => {
          if (!isDown) return;
          const dx = e.clientX - prevX;
          const dy = e.clientY - prevY;
          prevX = e.clientX;
          prevY = e.clientY;

          this.character.group.rotation.y += dx * 0.012;
          this.character.group.rotation.x = Math.max(-0.25, Math.min(0.25, this.character.group.rotation.x + dy * 0.008));
        });

        const onUp = () => { isDown = false; };
        wrap.addEventListener('pointerup', onUp);
        wrap.addEventListener('pointercancel', onUp);
      }
    }

    openPreviewMode() {
      if (!this.previewModal) return;
      this.isPreviewOpen = true;
      this.previewModal.classList.remove('mytee-preview-hidden');
      this.setState('greeting');

      // Move character to preview scene
      if (this.floatScene) this.floatScene.remove(this.character.group);
      if (this.previewScene) this.previewScene.add(this.character.group);

      this.character.group.rotation.set(0, 0, 0);
      this.onResize();
    }

    closePreviewMode() {
      if (!this.previewModal) return;
      this.isPreviewOpen = false;
      this.previewModal.classList.add('mytee-preview-hidden');

      // Move character back to floating scene
      if (this.previewScene) this.previewScene.remove(this.character.group);
      if (this.floatScene) this.floatScene.add(this.character.group);

      this.character.group.rotation.set(0, 0, 0);
      this.setState('idle');
    }

    /**
     * Public API: setState(state)
     * e.g. mytee.setState("speaking"), mytee.setState("happy")
     */
    setState(stateName) {
      this.state = stateName;
      // Dispatch external event so UI components can react
      window.dispatchEvent(new CustomEvent('mytee:state-changed', { detail: stateName }));
    }

    /**
     * Connect real audio stream for reactive mouth movement
     */
    connectAudio(mediaStreamOrElement) {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        this.audioContext = new AudioCtx();
        const source = mediaStreamOrElement instanceof MediaStream
          ? this.audioContext.createMediaStreamSource(mediaStreamOrElement)
          : this.audioContext.createMediaElementSource(mediaStreamOrElement);

        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 64;
        source.connect(this.analyser);
        this.audioData = new Uint8Array(this.analyser.frequencyBinCount);
      } catch (err) {
        console.warn('[MYTEE 3D] Audio hook error:', err);
      }
    }

    getAudioLevel() {
      if (!this.analyser || !this.audioData) return 0;
      this.analyser.getByteFrequencyData(this.audioData);
      let sum = 0;
      for (let i = 0; i < this.audioData.length; i++) {
        sum += this.audioData[i];
      }
      return (sum / this.audioData.length) / 255;
    }

    bindChatEvents() {
      // Connect to global MYTEE events
      window.addEventListener('mytee:idle', () => this.setState('idle'));
      window.addEventListener('mytee:greeting', () => this.setState('greeting'));
      window.addEventListener('mytee:listening', () => this.setState('listening'));
      window.addEventListener('mytee:thinking', () => this.setState('thinking'));
      window.addEventListener('mytee:speaking', () => this.setState('speaking'));
      window.addEventListener('mytee:happy', () => this.setState('happy'));
      window.addEventListener('mytee:error', () => this.setState('error'));
      window.addEventListener('mytee:sleep', () => this.setState('sleep'));

      // Look toward mouse pointer in floating mode
      window.addEventListener('pointermove', (e) => {
        if (this.isPreviewOpen || !this.character) return;
        const normX = (e.clientX / window.innerWidth) * 2 - 1;
        const normY = -(e.clientY / window.innerHeight) * 2 + 1;
        if (this.character.bones.head) {
          this.character.bones.head.rotation.y = normX * 0.35;
          this.character.bones.head.rotation.x = -normY * 0.2;
        }
      }, { passive: true });
    }

    onResize() {
      if (this.isPreviewOpen && this.previewRenderer && this.previewCanvas) {
        const wrap = document.getElementById('mytee-preview-canvas-wrap');
        if (wrap) {
          const w = wrap.clientWidth;
          const h = wrap.clientHeight;
          this.previewCamera.aspect = w / h;
          this.previewCamera.updateProjectionMatrix();
          this.previewRenderer.setSize(w, h, false);
        }
      }
    }

    animate() {
      requestAnimationFrame(this.animate);

      // Do not render if tab is hidden to save battery & GPU
      if (document.hidden) return;

      const delta = this.clock.getDelta();
      const time = this.clock.getElapsedTime();
      const audioLevel = this.getAudioLevel();

      // Update 3D model joints and facial screen
      if (this.character) {
        this.character.update(time, delta, this.state, audioLevel);
      }

      // Render the active mode
      if (this.isPreviewOpen) {
        if (this.previewRenderer && this.previewScene && this.previewCamera) {
          this.previewRenderer.render(this.previewScene, this.previewCamera);
        }
      } else {
        if (this.floatRenderer && this.floatScene && this.floatCamera) {
          this.floatRenderer.render(this.floatScene, this.floatCamera);
        }
      }
    }
  }

  // Initialize and expose global API on DOM load
  document.addEventListener('DOMContentLoaded', () => {
    // Only init if canvas container is ready
    setTimeout(() => {
      window.mytee = new Mytee3DManager();
      console.log('[MYTEE 3D] Mascot initialized. Control via window.mytee.setState("state")');
    }, 200);
  });

})(window, document);

