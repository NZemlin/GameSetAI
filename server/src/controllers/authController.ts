import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { supabase, supabaseAdmin } from '../index';
import { createClient, User } from '@supabase/supabase-js';

// Signup user
export const signup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, username } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: username ? { username } : undefined,
      },
    });

    if (error) {
      console.error('Supabase signup error:', error); // Keep important error logs
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(201).json({
      message: 'User created successfully',
      user: data.user,
    });
  } catch (error: any) {
    console.error('Unexpected error during signup:', error); // Keep important error logs
    res.status(500).json({
      error: error.message || 'Error creating user',
    });
  }
};

// Login user
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Supabase login error:', error);
      res.status(400).json({ error: error.message });
      return;
    }

    const token = jwt.sign(
      { userId: data.user.id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.status(200).json({
      message: 'Login successful',
      user: data.user,
      token,
    });
  } catch (error: any) {
    console.error('Login error details:', error);
    res.status(500).json({
      error: error.message || 'Error logging in',
    });
  }
};

// Request password reset
export const requestPasswordReset = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.CLIENT_URL}/reset-password`,
    });

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(200).json({
      message: 'Password reset email sent',
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Error requesting password reset',
    });
  }
};

// Reset password
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { password } = req.body;
    const token = req.headers.authorization?.split(' ')[1];

    if (!password) {
      res.status(400).json({ error: 'New password is required' });
      return;
    }

    if (!token) {
      res.status(401).json({ error: 'Reset token is required' });
      return;
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

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(200).json({
      message: 'Password updated successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Error resetting password',
    });
  }
};

// Logout user
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(200).json({
      message: 'Logged out successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Error logging out',
    });
  }
};

// Validate JWT token
export const validateToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      res.status(401).json({ error: 'Token is required' });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as { userId: string };
    res.status(200).json({ message: 'Token is valid', userId: decoded.userId });
  } catch (error: any) {
    console.error('Token validation error:', error.message);
    res.status(401).json({
      error: error.message || 'Invalid or expired token',
    });
  }
};

// Get user profile
export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      res.status(401).json({ error: 'Token is required' });
      return;
    }

    // Verify the JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as { userId: string };

    // Fetch user data from Supabase using the admin client
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(decoded.userId);

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    // Check if user exists
    if (!data.user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Type the user object explicitly
    const user: User = data.user;

    res.status(200).json({
      message: 'Profile fetched successfully',
      user: {
        id: user.id,
        email: user.email || '',
        username: user.user_metadata?.username || '',
      },
    });
  } catch (error: any) {
    console.error('Get profile error:', error.message);
    res.status(500).json({
      error: error.message || 'Error fetching profile',
    });
  }
};