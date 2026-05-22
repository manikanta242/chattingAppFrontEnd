// Matches your auth/models.py Users table
export interface User {
  id:          number;
  name:        string;
  email:       string;
  phonenumber: string;
  location:    string;
  status:      'online' | 'offline';
}

// Matches auth/schemas.py userSchema
export interface RegisterRequest {
  name:        string;
  email:       string;
  phonenumber: string;
  password:    string;
  location:    string;
}

// Matches auth/schemas.py loginSchema
export interface LoginRequest {
  email:    string;
  password: string;
}

// Matches your loginService response
export interface LoginResponse {
  token:   string;
  user_id: number;
  name:    string;
  email:   string;
}