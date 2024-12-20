export default function SignUpButton({ handleSignUp }) {
    return (
        <button
            onClick={handleSignUp}
            className="w-full mb-2 p-3 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 focus:outline-none"
        >
            Sign Up
        </button>
    );
}
