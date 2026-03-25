import express from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../models/db.js';

const router = express.Router();

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const result = await query('SELECT * FROM users WHERE id = $1', [id]);
    done(null, result.rows[0]);
  } catch (err) {
    done(err, null);
  }
});

const googleCallbackURL = process.env.NODE_ENV === 'production' 
  ? 'https://tu-dominio.com/api/auth/google/callback'
  : 'http://localhost:3001/api/auth/google/callback';

const githubCallbackURL = process.env.NODE_ENV === 'production'
  ? 'https://tu-dominio.com/api/auth/github/callback'
  : 'http://localhost:3001/api/auth/github/callback';

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: googleCallbackURL
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value;
      const existingUser = await query(
        'SELECT * FROM users WHERE google_id = $1 OR email = $2',
        [profile.id, email]
      );

      if (existingUser.rows.length > 0) {
        if (!existingUser.rows[0].google_id) {
          await query(
            'UPDATE users SET google_id = $1 WHERE id = $2',
            [profile.id, existingUser.rows[0].id]
          );
        }
        return done(null, existingUser.rows[0]);
      }

      const passwordHash = await bcrypt.hash(Math.random().toString(36), 10);
      const result = await query(
        `INSERT INTO users (email, password_hash, name, google_id, avatar_url) 
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [email, passwordHash, profile.displayName, profile.id, profile.photos?.[0]?.value]
      );

      return done(null, result.rows[0]);
    } catch (err) {
      return done(err, null);
    }
  }));
}

if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: githubCallbackURL
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value || `${profile.id}@github.local`;
      const existingUser = await query(
        'SELECT * FROM users WHERE github_id = $1 OR email = $2',
        [profile.id, email]
      );

      if (existingUser.rows.length > 0) {
        if (!existingUser.rows[0].github_id) {
          await query(
            'UPDATE users SET github_id = $1 WHERE id = $2',
            [profile.id, existingUser.rows[0].id]
          );
        }
        return done(null, existingUser.rows[0]);
      }

      const passwordHash = await bcrypt.hash(Math.random().toString(36), 10);
      const result = await query(
        `INSERT INTO users (email, password_hash, name, github_id, avatar_url) 
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [email, passwordHash, profile.username, profile.id, profile.photos?.[0]?.value]
      );

      return done(null, result.rows[0]);
    } catch (err) {
      return done(err, null);
    }
  }));
}

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: '/?error=oauth' }),
  (req, res) => {
    const token = jwt.sign(
      { userId: req.user.id },
      process.env.JWT_SECRET || 'flipbook-secret',
      { expiresIn: '1h' }
    );
    const refreshToken = jwt.sign(
      { userId: req.user.id },
      process.env.JWT_REFRESH_SECRET || 'flipbook-refresh-secret',
      { expiresIn: '7d' }
    );
    
    const redirectURL = `${process.env.FRONTEND_URL || 'http://localhost:3000'}?token=${token}&refresh=${refreshToken}`;
    res.redirect(redirectURL);
  }
);

router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));

router.get('/github/callback',
  passport.authenticate('github', { failureRedirect: '/?error=oauth' }),
  (req, res) => {
    const token = jwt.sign(
      { userId: req.user.id },
      process.env.JWT_SECRET || 'flipbook-secret',
      { expiresIn: '1h' }
    );
    const refreshToken = jwt.sign(
      { userId: req.user.id },
      process.env.JWT_REFRESH_SECRET || 'flipbook-refresh-secret',
      { expiresIn: '7d' }
    );
    
    const redirectURL = `${process.env.FRONTEND_URL || 'http://localhost:3000'}?token=${token}&refresh=${refreshToken}`;
    res.redirect(redirectURL);
  }
);

export default router;
