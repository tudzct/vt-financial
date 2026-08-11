import React from 'react'
import { Link } from 'react-router-dom'
import LoginForm from '../../components/LoginForm/LoginForm'

/** Renders the Figma-matched UC-02 login page. */
const Login: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#F4F5F7] px-4 py-10 lg:px-0 lg:pb-[268px] lg:pt-40">
      <div className="mx-auto flex w-full max-w-[400px] flex-col gap-10">
        <div className="flex flex-col items-center gap-16">
          <h1 className="whitespace-nowrap text-center font-['Poppins'] text-[40px] font-medium leading-8 tracking-[3.2px] text-[#299D91]">
            <span className="font-extrabold">FINE</span>bank.<span className="font-extrabold">IO</span>
          </h1>
          <LoginForm />
        </div>

        <Link
          to="/register"
          className="h-6 w-full overflow-hidden text-ellipsis whitespace-nowrap text-center text-base font-semibold leading-6 text-[#299D91]"
        >
          Create an account
        </Link>
      </div>
    </div>
  )
}

export default Login
