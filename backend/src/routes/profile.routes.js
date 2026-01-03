import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import * as profileController from '../controllers/profile.controller.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', profileController.getProfile);
router.post('/', profileController.createProfile);
router.put('/', profileController.updateProfile);
router.delete('/', profileController.deleteProfile);

export default router;
