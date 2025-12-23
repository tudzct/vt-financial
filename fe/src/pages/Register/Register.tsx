import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authService } from '../../api/auth.service'
import Input from '../../components/Input/Input'
import Button from '../../components/Button/Button'
import Error from '../../components/Error/Error'

const Register: React.FC = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    phone_number: '',
  })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp')
      return
    }

    setIsLoading(true)

    try {
      const { confirmPassword, ...registerData } = formData
      const response = await authService.register(registerData)
      
      if (response.success) {
        navigate('/login', { state: { message: 'Đăng ký thành công! Vui lòng đăng nhập.' } })
      } else {
        setError(response.message || 'Đăng ký thất bại. Vui lòng thử lại.')
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Đăng ký thất bại. Vui lòng thử lại.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto mt-8">
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-8">
        <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-6">
          Đăng ký
        </h2>

        {error && <Error message={error} />}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Họ và tên"
            name="full_name"
            type="text"
            value={formData.full_name}
            onChange={handleChange}
            required
            autoFocus
          />

          <Input
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
          />

          <Input
            label="Tên đăng nhập"
            name="username"
            type="text"
            value={formData.username}
            onChange={handleChange}
            required
          />

          <Input
            label="Số điện thoại"
            name="phone_number"
            type="tel"
            value={formData.phone_number}
            onChange={handleChange}
          />

          <Input
            label="Mật khẩu"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            required
            minLength={6}
          />

          <Input
            label="Xác nhận mật khẩu"
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
          />

          <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
            Đăng ký
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
          Đã có tài khoản?{' '}
          <Link to="/login" className="text-blue-600 dark:text-blue-400 hover:underline">
            Đăng nhập ngay
          </Link>
        </p>
      </div>
    </div>
  )
}

export default Register
