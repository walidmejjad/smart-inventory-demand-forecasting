export interface User {
  id: number
  first_name: string
  last_name: string
  email: string
  role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE'
}

export interface LoginRequest { email: string; password: string }
export interface LoginResponse { access_token: string; token_type: string; user: User }

export interface RegisterRequest { first_name: string; last_name: string; email: string; password: string }
export interface RegisterResponse extends User { created_at: string; updated_at: string }
