import Link from "next/link";

export default function RegisterLinks() { 
    return (
        <div className="flex space-x-3 items-center justify-center">
            <Link
                href={'../register/counselor'}
                className="w-1/3 p-3 rounded-md bg-gray-600 text-white text-sm hover:bg-gray-700 focus:outline-none block text-center"
            >
                Counselor
            </Link>
            <Link
                href={'../register/secretary'}
                className="w-1/3 p-3 rounded-md bg-gray-600 text-white text-sm hover:bg-gray-700 focus:outline-none block text-center"
            >
                Secretary
            </Link>
        </div>
    );
}
