'use strict';

const { LocalDataTrack, connect, createLocalTracks } = require('twilio-video');
const colorHash = new (require('color-hash'))();

const canvas = document.getElementById('canvas');
const connectButton = document.getElementById('connect');
const disconnectButton = document.getElementById('disconnect');
const form = document.getElementById('form');
const identityInput = document.getElementById('identity');
const nameInput = document.getElementById('name');
const participants = document.getElementById('participants');
const video = document.querySelector('#local-participant > video');

/**
 * Setup a LocalDataTrack to transmit mouse coordinates.
 * @returns {LocalDataTrack} dataTrack
 */
function setupLocalDataTrack() {
  const dataTrack = new LocalDataTrack();

  let mouseDown;
  let mouseCoordinates;

  window.addEventListener('mousedown', event => {
    mouseDown = true;
    const { pageX: x, pageY: y } = event;
    mouseCoordinates = { x: x / window.innerWidth, y: y / window.innerHeight };

    // Send the initial down coordinate
    dataTrack.send(JSON.stringify({
      mouseDown,
      mouseCoordinates
    }));
  }, false);

  window.addEventListener('mouseup', () => {
    mouseDown = false;
  }, false);

  window.addEventListener('mousemove', event => {
    const { pageX: x, pageY: y } = event;
    mouseCoordinates = { x: x / window.innerWidth, y: y / window.innerHeight };

    if (mouseDown) {
      const color = colorHash.hex(dataTrack.id);
      drawCircle(canvas, color, x, y);

      // Send the drawing coordinate
      dataTrack.send(JSON.stringify({
        mouseDown: false,
        mouseCoordinates
      }));
    }
  }, false);

  return dataTrack;
}

/**
 * Setup a LocalAudioTrack and LocalVideoTrack to render to a <video> element.
 * @param {HTMLVideoElement} video
 * @returns {Promise<Array<LocalAudioTrack|LocalVideoTrack>>} audioAndVideoTrack
 */
async function setupLocalAudioAndVideoTracks(video) {
  const audioAndVideoTrack = await createLocalTracks();
  audioAndVideoTrack.forEach(track => track.attach(video));
  return audioAndVideoTrack;
}

/**
 * Get an Access Token for the specified identity.
 * @param {string} identity
 * @returns {Promise<string>} token
 */
async function getToken(identity) {
  const response = await fetch(`/token?identity=${encodeURIComponent(identity)}`);
  if (!response.ok) {
    throw new Error('Unable to fetch Access Token');
  }
  return response.text();
}

let connectAttempt;
let room;

/**
 * Update the UI in response to disconnecting.
 * @returns {void}
 */
function didDisconnect(error) {
  if (room) {
    if (error) {
      console.error(error);
    }
    room.participants.forEach(participantDisconnected);
  }
  identityInput.disabled = false;
  nameInput.disabled = false;
  connectButton.disabled = false;
  disconnectButton.disabled = true;
}

/**
 * Run the app.
 * @returns {Promise<void>}
 */
async function main() {
  const dataTrack = setupLocalDataTrack();
  const audioAndVideoTrack = await setupLocalAudioAndVideoTracks(video);

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });

  const tracks = audioAndVideoTrack.concat(dataTrack);

  connectButton.addEventListener('click', async event => {
    event.preventDefault();

    identityInput.disabled = true;
    nameInput.disabled = true;
    connectButton.disabled = true;
    disconnectButton.disabled = false;

    try {
      const identity = identityInput.value;
      const name = nameInput.value;

      console.log('Getting Access Token...');
      const token = await getToken(identity);
      console.log(`Got Access Token "${token}"`);

      console.log('Attempting to connect...');
      connectAttempt = connect(token, {
        name,
        tracks
      });

      room = await connectAttempt;
      console.log(`Connected to Room "${room.name}"`);

      // NOTE(mroberts): Save a reference to `room` on `window` for debugging.
      window.room = room;

      room.once('disconnected', didDisconnect);

      room.participants.forEach(participantConnected);
      room.on('participantConnected', participantConnected);
    } catch (error) {
      didDisconnect(error);
    }
  });

  disconnectButton.addEventListener('click', event => {
    event.preventDefault();

    if (connectAttempt) {
      connectAttempt.cancel();
    }

    if (room) {
      room.disconnect();
    }

    didDisconnect();
  });
}

/**
 * Handle a connected Participant.
 * @param {Participant} participant
 * @retruns {void}
 */
function participantConnected(participant) {
  const participantDiv = document.createElement('div');
  participantDiv.className = 'participant';
  participantDiv.id = participant.sid;

  const videoElement = document.createElement('video');
  participantDiv.appendChild(videoElement);

  participants.appendChild(participantDiv);

  participant.tracks.forEach(track => trackAdded(participant, track));
  participant.on('trackAdded', track => trackAdded(participant, track));
  participant.on('trackRemoved', track => trackRemoved(participant, track));
  participant.once('disconnected', () => participantDisconnected(participant));
}

/**
 * Handle a disconnnected Participant.
 * @param {Participant} participant
 * @returns {void}
 */
function participantDisconnected(participant) {
  console.log(`Participant "${participant.identity}" disconnected`);
  const participantDiv = document.getElementById(participant.sid);
  if (participantDiv) {
    participantDiv.remove();
  }
}

/**
 * Handle an added Track.
 * @param {Participant} participant
 * @param {Track} track
 * @returns {void}
 */
function trackAdded(participant, track) {
  console.log(`Participant "${participant.identity}" added ${track.kind} Track ${track.sid}`);
  if (track.kind === 'audio' || track.kind === 'video') {
    track.attach(`#${participant.sid} > video`);
  } else if (track.kind === 'data') {
    const color = colorHash.hex(track.id);
    track.on('message', data => {
      const { mouseDown, mouseCoordinates: { x, y } } = JSON.parse(data);

      // TODO: Improve this by using mouseDown to draw a path on a canvas
      drawCircle(canvas, color, x * window.innerWidth, y * window.innerHeight);
    });
  }
}

/**
 * Handle a removed Track.
 * @param {Participant} participant
 * @param {Track} track
 * @returns {void}
 */
function trackRemoved(participant, track) {
  console.log(`Participant "${participant.identity}" removed ${track.kind} Track ${track.sid}`);
  if (track.kind === 'audio' || track.kind === 'video') {
    track.detach();
  }
}

/**
 * Draw a circle on the <canvas> element.
 * @param {HTMLCanvasElement} canvas
 * @param {string} color
 * @param {number} x
 * @param {number} y
 * @returns {void}
 */
function drawCircle(canvas, color, x, y) {
  const context = canvas.getContext('2d');
  context.beginPath();
  context.arc(
    x,
    y,
    10,
    0,
    2 * Math.PI,
    false);
  context.fillStyle = color;
  context.fill();
  context.strokeStyle = '#000000';
  context.stroke();
}

// Go!
main().catch(console.error);
