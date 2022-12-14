import * as userService from "../../src/services/userService.js";
import { dbInit, dbTerminate } from "../../src/db/setup.js";
import {
  DELETE_USER_FAILURE,
  EMAIL_ALREADY_EXISTS,
  EMAIL_VALIDATION_FAIL,
  GET_USER_BY_ID_FAILURE,
  PASSWORDS_IDENTICAL,
  PASSWORD_DOES_NOT_MATCH,
  PASSWORD_VALIDATION_FAIL,
  TOKEN_NOT_FOUND,
  USERNAME_ALREADY_EXISTS,
  USERNAME_VALIDATION_FAIL,
  USER_ALREADY_EMAIL_VERIFIED,
  USER_NOT_EMAIL_VERIFIED,
  USER_NOT_FOUND,
} from "../../src/constants/responseMessages.js";

describe("User Service", () => {
  beforeAll(async () => {
    await dbInit();
  });

  let userId;
  let confirmationCode;
  let retrievedToken;
  const email = "jesttest@u.nus.edu";
  const newEmail = "jesttest2@u.nus.edu";
  const username = "jesttest";
  const password = "jesttest123";
  const oldPassword = password;
  const newPassword = "jesttest1234";
  const resetPassword = "jesttest5678";

  const invalidUserId = "1234567";
  const invalidEmail = "test@test";
  const invalidUsernameStartWithNumber = "1jesttest123";
  const invalidShortPassword = "12345";
  const invalidConfirmationCode = "123456";
  const invalidOldPassword = "notjesttest123";
  const invalidRetrievedToken = "12345678";

  describe("createUser", () => {
    it("Should create user successfully", async () => {
      const f = async () => {
        const createdUser = await userService.createUser(
          email,
          username,
          password
        );
        confirmationCode = createdUser.confirmationCode;
      };

      await expect(f()).resolves.not.toThrow();
    });
  });

  describe("createUserFail", () => {
    it("Should not create user with invalid email", async () => {
      const f = async () => {
        const createdUser = await userService.createUser(
          invalidEmail,
          username,
          password
        );
      };

      await expect(f()).rejects.toThrow(EMAIL_VALIDATION_FAIL);
    });

    it("Should not create user with invalid username starting with number", async () => {
      const f = async () => {
        const createdUser = await userService.createUser(
          email,
          invalidUsernameStartWithNumber,
          password
        );
      };

      await expect(f()).rejects.toThrow(USERNAME_VALIDATION_FAIL);
    });

    it("Should not create user with invalid short password", async () => {
      const f = async () => {
        const createdUser = await userService.createUser(
          email,
          username,
          invalidShortPassword
        );
      };

      await expect(f()).rejects.toThrow(PASSWORD_VALIDATION_FAIL);
    });

    it("Should not create user as user with same email exists already", async () => {
      const f = async () => {
        const createdUser = await userService.createUser(
          email,
          username,
          password
        );
      };

      await expect(f()).rejects.toThrow(EMAIL_ALREADY_EXISTS);
    });

    it("Should not create user as user with same username exists already", async () => {
      const f = async () => {
        const createdUser = await userService.createUser(
          newEmail,
          username,
          password
        );
      };

      await expect(f()).rejects.toThrow(USERNAME_ALREADY_EXISTS);
    });
  });

  describe("verifyUserFail", () => {
    it("Should not verify user successfully as it is not email verified", async () => {
      const f = async () => {
        const passwordMatch = await userService.verifyUser(email, password);
      };

      await expect(f()).rejects.toThrow(USER_NOT_EMAIL_VERIFIED);
    });

    it("Should not verify the user's credentials if email does not belong to any account", async () => {
      const f = async () => {
        const match = await userService.verifyUser(invalidEmail, newPassword);
      };
      await expect(f()).rejects.toThrow(USER_NOT_FOUND);
    });
  });

  describe("confirmUser", () => {
    it("Should confirm user account successfully", async () => {
      const f = async () => {
        await userService.emailVerifyingUser(confirmationCode);
      };
      await expect(f()).resolves.not.toThrow();
    });
  });

  describe("confirmUserFail", () => {
    it("Should not confirm account with incorrect confirmation code", async () => {
      const f = async () => {
        await userService.emailVerifyingUser(invalidConfirmationCode);
      };

      await expect(f()).rejects.toThrow(USER_NOT_FOUND);
    });

    it("Should not confirm user account as it is confirmed already", async () => {
      const f = async () => {
        await userService.emailVerifyingUser(confirmationCode);
      };
      await expect(f()).rejects.toThrow(USER_ALREADY_EMAIL_VERIFIED);
    });
  });

  describe("getUser", () => {
    it("Should get the user using email", async () => {
      const f = async () => {
        const user = await userService.getUser(email);
        expect(user).not.toBeNull();

        userId = user.id;
      };

      await expect(f()).resolves.not.toThrow();
    });
  });

  describe("getUserFail", () => {
    it("Should not get the user using email not belonging to any account", async () => {
      const f = async () => {
        const user = await userService.getUser(invalidEmail);
        expect(user).not.toBeNull();

        userId = user.id;
      };

      await expect(f()).rejects.toThrow(USER_NOT_FOUND);
    });
  });

  describe("updateUserPassword", () => {
    it("Should update the user's password successfully", async () => {
      const f = async () => {
        await userService.updateUserPassword(userId, oldPassword, newPassword);
      };

      await expect(f()).resolves.not.toThrow();
    });
  });

  describe("updateUserPasswordFail", () => {
    it("Should not update the user's password successfully if new password identical to old password", async () => {
      const f = async () => {
        await userService.updateUserPassword(userId, oldPassword, oldPassword);
      };

      await expect(f()).rejects.toThrow(PASSWORDS_IDENTICAL);
    });

    it("Should not update the user's password successfully if new password is short and invalid", async () => {
      const f = async () => {
        await userService.updateUserPassword(
          userId,
          oldPassword,
          invalidShortPassword
        );
      };

      await expect(f()).rejects.toThrow(PASSWORD_VALIDATION_FAIL);
    });

    it("Should not update the user's password successfully if account doesn't exist", async () => {
      const f = async () => {
        await userService.updateUserPassword(
          invalidUserId,
          oldPassword,
          newPassword
        );
      };

      await expect(f()).rejects.toThrow(GET_USER_BY_ID_FAILURE);
    });

    it("Should not update the user's password successfully if old password is incorrect", async () => {
      const f = async () => {
        await userService.updateUserPassword(
          userId,
          invalidOldPassword,
          newPassword
        );
      };

      await expect(f()).rejects.toThrow(PASSWORD_DOES_NOT_MATCH);
    });
  });

  describe("verifyUser", () => {
    it("Should verify the user's credentials successfully", async () => {
      const f = async () => {
        const match = await userService.verifyUser(email, newPassword);

        expect(match).not.toBeNull();
        expect(match).toBe(true);
      };

      await expect(f()).resolves.not.toThrow();
    });
  });

  describe("sendResetPasswordLinkUser", () => {
    it("Should send the user the link to reset password successfully", async () => {
      const f = async () => {
        const { user, token } = await userService.sendResetPasswordLinkUser(
          email
        );

        userId = user.id;
        retrievedToken = token.token;
      };

      await expect(f()).resolves.not.toThrow();
    });
  });

  describe("sendResetPasswordLinkUserFail", () => {
    it("Should not send user link to reset password if email does not belong to any account ", async () => {
      const f = async () => {
        const { user, token } = await userService.sendResetPasswordLinkUser(
          invalidEmail
        );
      };

      await expect(f()).rejects.toThrow(USER_NOT_FOUND);
    });
  });

  describe("resetPasswordUser", () => {
    it("Should reset user password successfully", async () => {
      const f = async () => {
        await userService.resetPasswordUser(
          userId,
          retrievedToken,
          resetPassword
        );
      };

      await expect(f()).resolves.not.toThrow();
    });
  });

  describe("resetPasswordUserFail", () => {
    it("Should not reset user password as token not found", async () => {
      const f = async () => {
        await userService.resetPasswordUser(
          userId,
          invalidRetrievedToken,
          resetPassword
        );
      };

      await expect(f()).rejects.toThrow(TOKEN_NOT_FOUND);
    });

    it("Should not reset user password as new password is invalid", async () => {
      const f = async () => {
        await userService.resetPasswordUser(
          userId,
          retrievedToken,
          invalidShortPassword
        );
      };

      await expect(f()).rejects.toThrow(PASSWORD_VALIDATION_FAIL);
    });
  });

  describe("deleteUser", () => {
    it("Should delete the user successfully", async () => {
      const f = async () => {
        await userService.deleteUser(userId);
      };

      await expect(f()).resolves.not.toThrow();
    });
  });

  describe("deleteUserFail", () => {
    it("Should not delete user with invalid userId", async () => {
      const f = async () => {
        await userService.deleteUser(invalidUserId);
      };

      await expect(f()).rejects.toThrow(DELETE_USER_FAILURE);
    });
  });

  afterAll(async () => {
    await dbTerminate();
  });
});
