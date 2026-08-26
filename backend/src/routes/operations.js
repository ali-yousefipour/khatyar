import { Router } from 'express';
import { q } from '../db.js';
import { authenticate } from '../middleware/auth.js';

export const operationsRouter = Router();
operationsRouter.use(authenticate);

operationsRouter.get('/dashboard', async (req,res)=>{
 const a = await q(`SELECT COUNT(*) total FROM missions WHERE DATE(created_at)=CURRENT_DATE`);
 const b = await q(`SELECT status,COUNT(*) count FROM missions WHERE DATE(created_at)=CURRENT_DATE GROUP BY status`);
 res.json({total:Number(a.rows?.[0]?.total||0), statuses:b.rows||[]});
});

operationsRouter.get('/missions/status', async (req,res)=>{
 const r=await q(`SELECT id,status,line_id,assigned_to,started_at,completed_at FROM missions ORDER BY id DESC LIMIT 200`);
 res.json(r.rows||[]);
});

operationsRouter.get('/lines/coverage', async (req,res)=>{
 const r=await q(`SELECT l.id,l.name,COUNT(m.id) missions FROM lines l LEFT JOIN missions m ON m.line_id=l.id GROUP BY l.id,l.name ORDER BY l.name`);
 res.json(r.rows||[]);
});

operationsRouter.get('/users/performance', async (req,res)=>{
 const r=await q(`SELECT u.id,u.first_name,u.last_name,COUNT(m.id) missions FROM users u LEFT JOIN missions m ON m.assigned_to=u.id GROUP BY u.id,u.first_name,u.last_name`);
 res.json(r.rows||[]);
});
