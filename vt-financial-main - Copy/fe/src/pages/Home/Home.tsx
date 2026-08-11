import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Button from '../../components/Button/Button'

const Home: React.FC = () => {
  const { isAuthenticated } = useAuth()

  return (
    <div className="text-center">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
        Chào mừng đến với Financial Management App
      </h1>
      <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
        Quản lý tài chính cá nhân một cách thông minh và hiệu quả
      </p>

      {isAuthenticated ? (
        <Link to="/dashboard">
          <Button size="lg">Đi đến Dashboard</Button>
        </Link>
      ) : (
        <div className="flex justify-center space-x-4">
          <Link to="/login">
            <Button size="lg" variant="primary">
              Đăng nhập
            </Button>
          </Link>
          <Link to="/register">
            <Button size="lg" variant="outline">
              Đăng ký
            </Button>
          </Link>
        </div>
      )}

      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Quản lý Tài khoản
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Theo dõi tất cả tài khoản ngân hàng của bạn ở một nơi
          </p>
        </div>

        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Giao dịch
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Ghi chép và phân loại mọi giao dịch thu chi
          </p>
        </div>

        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Mục tiêu Tài chính
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Đặt và theo dõi các mục tiêu tiết kiệm và chi tiêu
          </p>
        </div>
      </div>
    </div>
  )
}

export default Home

