import { redirect } from "next/navigation";
import { getServerSession } from "@tutly/auth";
import { db } from "@tutly/db";
import Community from "./_components/CommunityPage";

export default async function CommunityPage() {
  const session = await getServerSession();
  if (!session?.user) {
    redirect("/sign-in");
  }

  const allDoubts = await db.course.findMany({
    where: {
      enrolledUsers: {
        some: {
          username: session.user.username,
        },
      },
    },
    include: {
      doubts: {
        include: {
          user: true,
          response: {
            include: {
              user: true,
            },
          },
        },
      },
    },
  });

  return (
    <main className="m-2 mx-5 flex flex-col items-center justify-center">
      <Community allDoubts={allDoubts} currentUser={session.user} />
    </main>
  );
} 