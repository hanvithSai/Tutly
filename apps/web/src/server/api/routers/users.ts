import type { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import { db } from "@/server/db";
import generateRandomPassword from "@/utils/generateRandomPassword";

export const usersRouter = createTRPCRouter({
  getCurrentUser: protectedProcedure.query(async ({ ctx }) => {
    const currentUser = ctx.session?.user;
    if (!currentUser) return null;

    const user = await db.user.findUnique({
      where: { id: currentUser.id },
      select: {
        id: true,
        image: true,
        username: true,
        name: true,
        email: true,
      },
    });
    return user;
  }),

  getAllEnrolledUsers: protectedProcedure
    .input(
      z.object({
        courseId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const currentUser = ctx.session?.user;
      if (!currentUser) return null;
      const enrolledUsers = await db.user.findMany({
        where: {
          role: "STUDENT",
          organizationId: currentUser.organizationId,
          enrolledUsers: {
            some: {
              courseId: input.courseId,
            },
          },
        },
        select: {
          id: true,
          image: true,
          username: true,
          name: true,
          email: true,
        },
      });

      return enrolledUsers;
    }),

  getAllUsers: protectedProcedure
    .input(
      z.object({
        courseId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const currentUser = ctx.session?.user;
      if (!currentUser) return null;

      const globalUsers = await db.user.findMany({
        where: {
          organizationId: currentUser.organizationId,
        },
        select: {
          id: true,
          image: true,
          username: true,
          name: true,
          email: true,
          role: true,
          enrolledUsers: {
            where: {
              courseId: input.courseId,
            },
            select: {
              course: {
                select: {
                  id: true,
                  title: true,
                },
              },
              mentorUsername: true,
            },
          },
        },
      });
      return globalUsers;
    }),

  updateUserProfile: protectedProcedure
    .input(
      z.object({
        profile: z
          .object({
            mobile: z.string(),
            whatsapp: z.string(),
            gender: z.string(),
            tshirtSize: z.string(),
            secondaryEmail: z.string(),
            dateOfBirth: z
              .union([z.date(), z.string()])
              .transform((val) =>
                typeof val === "string" ? new Date(val) : val,
              )
              .nullable(),
            hobbies: z.array(z.string()),
            aboutMe: z.string(),
            socialLinks: z.record(z.string()),
            professionalProfiles: z.record(z.string()),
            academicDetails: z.record(z.string()),
            experiences: z.array(z.record(z.any())),
            address: z.record(z.string()),
            documents: z.record(z.string()),
          })
          .partial(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const currentUser = ctx.session?.user;
      if (!currentUser) return null;

      const defaultValues = {
        userId: currentUser.id,
        mobile: null,
        whatsapp: null,
        gender: null,
        tshirtSize: null,
        secondaryEmail: null,
        dateOfBirth: null,
        hobbies: [],
        aboutMe: null,
        socialLinks: {},
        professionalProfiles: {},
        academicDetails: {},
        experiences: [],
        address: {},
        documents: {},
      };

      const createData = {
        ...defaultValues,
        ...Object.fromEntries(
          Object.entries(input.profile).map(([key, value]) => [
            key,
            value ?? defaultValues[key as keyof typeof defaultValues],
          ]),
        ),
      };

      const updateData = Object.fromEntries(
        Object.entries(input.profile)
          .filter(([_, value]) => value !== undefined)
          .map(([key, value]) => [key, value]),
      );

      const updatedProfile = await db.profile.upsert({
        where: { userId: currentUser.id },
        create: createData,
        update: updateData,
      });

      return updatedProfile;
    }),

  updateUserAvatar: protectedProcedure
    .input(
      z.object({
        avatar: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const currentUser = ctx.session?.user;
      if (!currentUser) return null;

      const updatedProfile = await db.user.update({
        where: { id: currentUser.id },
        data: { image: input.avatar },
      });

      return updatedProfile;
    }),

  createUser: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        username: z.string(),
        email: z.string(),
        password: z.string(),
        role: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        if (!ctx.session?.user.organization) {
          throw new Error("Organization not found");
        }

        const hashedPassword = await bcrypt.hash(input.password, 10);

        const user = await db.user.create({
          data: {
            name: input.name,
            username: input.username,
            email: input.email,
            password: hashedPassword,
            role: input.role as Role,
            organization: { connect: { id: ctx.session.user.organization.id } },
            oneTimePassword: generateRandomPassword(8),
          },
        });

        return user;
      } catch (error) {
        throw new Error("Failed to create user");
      }
    }),

  updateUser: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string(),
        username: z.string(),
        email: z.string(),
        role: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        if (!ctx.session?.user.organization) {
          throw new Error("Organization not found");
        }

        const user = await db.user.update({
          where: { id: input.id },
          data: {
            name: input.name,
            username: input.username,
            email: input.email,
            role: input.role as Role,
          },
        });
        return user;
      } catch (error) {
        throw new Error("Failed to update user");
      }
    }),

  deleteUser: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        await db.user.delete({ where: { id: input.id } });
      } catch (error) {
        throw new Error("Failed to delete user");
      }
    }),

  getUser: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .query(async ({ input }) => {
      try {
        const user = await db.user.findUnique({
          where: { id: input.id },
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            role: true,
          },
        });

        if (!user) {
          throw new Error("User not found");
        }

        return user;
      } catch (error) {
        throw new Error("Failed to get user");
      }
    }),

  bulkUpsert: protectedProcedure
    .input(
      z.array(
        z.object({
          name: z.string(),
          username: z.string(),
          email: z.string(),
          password: z.string().optional(),
          role: z.string(),
        }),
      ),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        if (!ctx.session?.user.organization) {
          throw new Error("Organization not found");
        }

        const results = await Promise.all(
          input.map(async (user) => {
            const existingUser = await db.user.findFirst({
              where: {
                email: user.email,
                organizationId: ctx.session!.user.organization!.id,
              },
            });

            const hashedPassword = user.password
              ? await bcrypt.hash(user.password, 10)
              : null;

            if (existingUser) {
              return db.user.update({
                where: { id: existingUser.id },
                data: {
                  name: user.name,
                  username: user.username,
                  password: hashedPassword,
                  role: user.role as Role,
                },
              });
            }

            return db.user.create({
              data: {
                ...user,
                password: hashedPassword,
                organization: {
                  connect: { id: ctx.session!.user.organization!.id },
                },
                role: user.role as Role,
                oneTimePassword: generateRandomPassword(8),
              },
            });
          }),
        );

        return results;
      } catch (error) {
        throw new Error("Failed to bulk upsert users");
      }
    }),

  deleteSession: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const currentUser = ctx.session?.user;
      if (!currentUser) {
        throw new Error("Not authenticated");
      }

      const session = await db.session.findUnique({
        where: {
          id: input.sessionId,
          userId: currentUser.id,
        },
      });

      if (!session) {
        throw new Error("Session not found");
      }

      if (ctx.session?.id === input.sessionId) {
        throw new Error("Cannot delete current session");
      }

      try {
        await db.session.delete({
          where: {
            id: input.sessionId,
            userId: currentUser.id,
          },
        });
      } catch (error) {
        throw new Error("Failed to delete session");
      }
    }),

  unlinkAccount: protectedProcedure
    .input(
      z.object({
        provider: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const currentUser = ctx.session?.user;
      if (!currentUser) {
        throw new Error("Not authenticated");
      }

      const account = await db.account.findUnique({
        where: {
          userId: currentUser.id,
          provider: input.provider,
        },
      });

      if (!account) {
        throw new Error("Account not found");
      }

      const accountCount = await db.account.count({
        where: {
          userId: currentUser.id,
        },
      });

      if (accountCount <= 1) {
        throw new Error("Cannot unlink last account");
      }

      try {
        await db.account.delete({
          where: {
            userId: currentUser.id,
            provider: input.provider,
          },
        });
      } catch (error) {
        throw new Error("Failed to unlink account");
      }
    }),

  resetPassword: publicProcedure
    .input(
      z.object({
        email: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const user = await db.user.findUnique({
        where: { email: input.email },
      });

      if (!user) {
        throw new Error("User not found");
      }

      await db.user.update({
        where: { id: user.id },
        data: {
          password: null,
        },
      });

      return user;
    }),

  updatePassword: protectedProcedure
    .input(
      z.object({
        email: z.string(),
        oldPassword: z.string().optional(),
        newPassword: z
          .string()
          .min(1, "Password is required")
          .min(8, "Password must have than 8 characters"),
        confirmPassword: z
          .string()
          .min(1, "Password is required")
          .min(8, "Password must have than 8 characters"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const currentUser = ctx.session?.user;
      if (!currentUser) {
        return {
          error: {
            message: "Unauthorized",
          },
        };
      }

      if (input.newPassword !== input.confirmPassword) {
        return {
          error: {
            message: "Passwords don't match",
          },
        };
      }

      const userExists = await db.user.findUnique({
        where: {
          email: input.email,
        },
        select: {
          password: true,
        },
      });

      if (!userExists) {
        return {
          error: {
            message: "User does not exist",
          },
        };
      }

      if (userExists.password !== null) {
        if (!input.oldPassword) {
          return {
            error: {
              message: "Please provide old password",
            },
          };
        }

        const isPasswordValid = await bcrypt.compare(
          input.oldPassword,
          userExists.password,
        );
        if (!isPasswordValid) {
          return {
            error: {
              message: "Old password is incorrect",
            },
          };
        }
      }

      const password = await bcrypt.hash(input.newPassword, 10);

      await db.user.update({
        where: {
          email: input.email,
        },
        data: {
          password: password,
        },
      });

      return {
        success: true,
        message: "User updated successfully",
      };
    }),

  instructor_resetPassword: protectedProcedure
    .input(
      z.object({
        email: z.string(),
        newPassword: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const currentUser = ctx.session?.user;
      if (!currentUser || currentUser.role !== "INSTRUCTOR") {
        return {
          error: {
            message: "Unauthorized",
          },
        };
      }

      const user = await db.user.findUnique({
        where: { email: input.email },
      });

      if (!user) {
        return {
          error: {
            message: "User not found",
          },
        };
      }

      const hashedPassword = await bcrypt.hash(input.newPassword, 10);

      await db.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      });

      return {
        success: true,
        message: "Password reset successfully",
      };
    }),

  changePassword: protectedProcedure
    .input(
      z.object({
        oldPassword: z.string().optional(),
        password: z.string().min(8),
        confirmPassword: z.string().min(8),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session?.user;
      try {
        if (!user) {
          throw new Error("User not found");
        }

        if (input.password !== input.confirmPassword) {
          throw new Error("Passwords do not match");
        }

        const dbUser = await db.user.findUnique({
          where: { id: user.id },
          select: {
            password: true,
          },
        });

        if (!dbUser) {
          throw new Error("User not found");
        }

        if (input.oldPassword) {
          const isOldPasswordCorrect = await bcrypt.compare(
            input.oldPassword,
            dbUser.password!,
          );

          if (!isOldPasswordCorrect) {
            throw new Error("Old password is incorrect");
          }
        }

        const hashedPassword = await bcrypt.hash(input.password, 10);

        await db.user.update({
          where: { id: user.id },
          data: { password: hashedPassword },
        });

        await db.session.deleteMany({
          where: {
            userId: user.id,
          },
        });

        return {
          success: true,
          message: "Password changed successfully",
        };
      } catch (error) {
        console.error("Error changing password:", error);
        throw new Error(
          error instanceof Error
            ? error.message
            : "An error occurred while changing password",
        );
      }
    }),

  getUserProfile: protectedProcedure.query(async ({ ctx }) => {
    const currentUser = ctx.session?.user;
    if (!currentUser) return null;

    const userProfile = await db.user.findUnique({
      where: {
        id: currentUser.id,
      },
      include: {
        profile: true,
      },
    });

    return userProfile;
  }),
});
