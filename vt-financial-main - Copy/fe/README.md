# Financial Management Frontend

Frontend application được xây dựng với React + TypeScript + Vite + TailwindCSS.

## 🚀 Cài đặt

```bash
# Cài đặt dependencies
npm install

# Chạy development server
npm run dev

# Build production
npm run build

# Preview production build
npm run preview
```

## 📁 Cấu trúc thư mục

```
src/
 ├── api/            # Axios instance và các service functions
 ├── assets/         # Hình ảnh, icon
 ├── components/     # Component tái sử dụng
 ├── context/        # React Context (Auth, Theme)
 ├── hooks/          # Custom hooks
 ├── pages/          # Các trang chính
 ├── router/         # Định nghĩa routes
 ├── utils/          # Helper functions
 ├── App.tsx
 └── main.tsx
```

## 🔧 Cấu hình môi trường

Tạo file `.env` trong thư mục `fe/`:

```
VITE_API_BASE_URL=http://localhost:8001/api
```

## 📦 Dependencies chính

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **React Router v6** - Routing
- **Axios** - HTTP client
- **TailwindCSS** - Styling
- **Zustand** - State management (optional)

## 🎨 UI Components

- `Button` - Button component với nhiều variants
- `Input` - Input component với validation
- `Loading` - Loading spinner
- `Error` - Error display component
- `Layout` - Main layout với header và footer

## 🔐 Authentication

Ứng dụng sử dụng JWT token được lưu trong localStorage. Context API được sử dụng để quản lý authentication state.

## 🌙 Theme

Hỗ trợ dark mode thông qua ThemeContext. Theme được lưu trong localStorage.
