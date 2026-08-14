import React from 'react'
import SignUpForm from '../../components/SignUpForm/SignUpForm'

/** Renders the Figma-matched UC-01 registration page. */
const Register: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#F4F5F7] px-4 py-16 lg:px-0 lg:py-20">
      <div className="mx-auto flex w-full max-w-[400px] flex-col items-center gap-10">
        <h1 className="whitespace-nowrap text-center font-['Poppins'] text-[40px] font-medium leading-8 tracking-[3.2px] text-[#299D91]">
          <span className="font-extrabold">FINE</span>bank.<span className="font-extrabold">IO</span>
        </h1>
        <SignUpForm />
      </div>
    </div>
  )
}

export default Register
