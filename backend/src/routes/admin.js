import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { q } from '../db.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

export const adminRouter = Router();
// تمام endpointهای این Router مدیریتی هستند؛ احراز هویت و سطح دسترسی مدیر
// در سطح Router اعمال می‌شود تا هیچ endpoint جدیدی به‌اشتباه بدون requireAdmin منتشر نشود.
adminRouter.use(authenticate, requireAdmin);

const upload = multer({ dest: '/tmp/uploads' });
