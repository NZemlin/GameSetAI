import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../index';
import { createClient } from '@supabase/supabase-js';

export const signup = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;

    return res.status(201).json({
      message: 'User created successfully',
      user: data.user,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: error.message || 'Error creating user',
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    // Create JWT token
    const token = jwt.sign(
      { userId: data.user.id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    return res.status(200).json({
      message: 'Login successful',
      user: data.user,
      token,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: error.message || 'Error logging in',
    });
  }
};

export const requestPasswordReset = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.CLIENT_URL}/reset-password`,
    });

    if (error) throw error;

    return res.status(200).json({
      message: 'Password reset email sent',
    });
  } catch (error: any) {
    return res.status(500).json({
      error: error.message || 'Error requesting password reset',
    });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { password } = req.body;
    const token = req.headers.authorization?.split(' ')[1];

    if (!password) {
      return res.status(400).json({ error: 'New password is required' });
    }

    if (!token) {
      return res.status(401).json({ error: 'Reset token is required' });
    }

    // Create a new Supabase client with the user's token
    const userClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    const { error } = await userClient.auth.updateUser({
      password: password,
    });

    if (error) throw error;

    return res.status(200).json({
      message: 'Password updated successfully',
    });
  } catch (error: any) {
    return res.status(500).json({
      error: error.message || 'Error resetting password',
    });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) throw error;

    return res.status(200).json({
      message: 'Logged out successfully',
    });
  } catch (error: any) {
    return res.status(500).json({
      error: error.message || 'Error logging out',
    });
  }
}; 