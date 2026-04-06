import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: [
    "/(app)/:path*",
    "/dashboard/:path*",
    "/invoices/:path*",
    "/customers/:path*",
    "/expenses/:path*",
    "/bank/:path*",
    "/reports/:path*",
    "/tax/:path*",
    "/companies/:path*",
  ],
};
