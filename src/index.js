'use strict';

const { LocalDataTrack, connect, createLocalTracks } = require('twilio-video');

const identityInput = document.getElementById('identity');
const nameInput = document.getElementById('name');
const connectButton = document.getElementById('connect');
const disconnectButton = document.getElementById('disconnect');
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');

/**
 * Setup a LocalDataTrack to transmit mouse coordinates on a <canvas> element.
 * @param {HTMLCanvasElement} canvas
 * @returns {LocalDataTrack} dataTrack
 */
function setupLocalDataTrack(canvas) {
  const dataTrack = new LocalDataTrack();

  let mouseDown;
  let mouseCoordinates;

  canvas.addEventListener('mousedown', () => {
    mouseDown = true;
  });

  canvas.addEventListener('mouseup', () => {
    mouseUp = false;
  });

  canvas.addEventListener('mousemove', event => {
    mouseCoordinates = {
      x: event.clientX,
      y: event.clientY
    };

    dataTrack.send({
      mouseDown,
      mouseCoordinates
    });
  });

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

/**
 * Update the UI in response to disconnecting.
 * @returns {void}
 */
function didDisconnect() {
  if (room) {
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
  const dataTrack = setupLocalDataTrack(canvas);
  const audioAndVideoTrack = await setupLocalAudioAndVideoTracks(video);
  const tracks = [dataTrack].concat(audioAndVideoTrack);

  let connectAttempt;
  let room;

  connectButton.addEventListener('click', async () => {
    identityInput.disabled = true;
    nameInput.disabled = true;
    connectButton.disabled = true;
    disconnectButton.disabled = false;

    try {
      const identity = identityInput.value;
      const token = await getToken(identity);
      const name = nameInput.value;

      connectAttempt = connect(token, {
        logLevel: 'debug',
        name,
        tracks
      });

      room = await connectAttempt;

      // NOTE(mroberts): Save a reference to `room` on `window` for debugging.
      window.room = room;

      room.once('disconnected', didDisconnect);

      room.participants.forEach(participantConnected);
      room.on('participantConnected', participantConnected);
    } catch (error) {
      didDisconnect(error);
    }
  });

  disconnectButton.addEventListener('click', () => {
    if (connectAttempt) {
      connectAttempt.cancel();
    } else if (room) {
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

  document.appendChild(participantDiv);

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
  participantDiv.remove();
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
    track.on('message', data => {
      console.log(data);
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

// Go!
main().catch(console.error);
