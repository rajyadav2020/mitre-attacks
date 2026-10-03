// auth.controller.js
const svc = require("./auth.service");
const ctx = (req) => ({ requestId: req.id });

exports.register = async (req, res) => res.status(201).json(await svc.register(req.body, ctx(req)));
exports.login    = async (req, res) => res.json(await svc.login(req.body, ctx(req)));
exports.refresh  = async (req, res) => res.json(await svc.refresh(req.body));
exports.logout   = async (req, res) => { await svc.logout(req.body); res.status(204).end(); };