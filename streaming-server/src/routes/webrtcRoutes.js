/**
 * WebRTC Routes
 */

const express = require('express');
const router = express.Router();

module.exports = (webrtcSignaling) => {
  // Get WebRTC configuration
  router.get('/config', (req, res) => {
    res.json({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });
  });

  // Create offer
  router.post('/offer', async (req, res) => {
    try {
      const { streamId, offer } = req.body;
      
      // For now, just return success
      res.json({ 
        success: true, 
        message: 'Offer received',
        streamId 
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create answer
  router.post('/answer', async (req, res) => {
    try {
      const { streamId, answer } = req.body;
      
      // For now, just return success
      res.json({ 
        success: true, 
        message: 'Answer received',
        streamId 
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // ICE candidate
  router.post('/ice-candidate', async (req, res) => {
    try {
      const { streamId, candidate } = req.body;
      
      // For now, just return success
      res.json({ 
        success: true, 
        message: 'ICE candidate received',
        streamId 
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};
