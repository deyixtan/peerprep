import bcrypt from "bcryptjs";
import jsonwebtoken from "jsonwebtoken";
import * as userRepo from "../db/repositories/user.js";
import * as tokenRepo from "../db/repositories/token.js";
import * as regExp from "../constants/regExp.js";
import * as responseMessages from "../constants/responseMessages.js";
import { SALT_ROUNDS } from "../constants/bcrypt.js";
import { FieldValidationFailure } from "../exceptions/FieldValidationFailure.js";
import { IdenticalPassword } from "../exceptions/IdenticalPassword.js";
import { InformationExists } from "../exceptions/InformationExists.js";
import { PasswordNotMatch } from "../exceptions/PasswordNotMatch.js";
import { RepositoryFailure } from "../exceptions/RepositoryFailure.js";
import { UserNotFound } from "../exceptions/UserNotFound.js";
import { TokenNotFound } from "../exceptions/TokenNotFound.js";
import { UserNotVerified } from "../exceptions/UserNotVerified.js";
import { sendConfirmationEmail, sendResetEmail } from "../nodeMailerConfig.js";
import { EMAIL_CONFIRMATION_SECRET, EMAIL_RESET_URI } from "../configs.js";
import { UserAlreadyEmailVerified } from "../exceptions/UserAlreadyEmailVerified.js";

export const getUser = async (email) => {
  let user;
  try {
    user = await userRepo.getUserByEmail(email);
  } catch (err) {
    throw new RepositoryFailure(responseMessages.GET_USER_BY_EMAIL_FAILURE);
  }

  if (!user) {
    throw new UserNotFound(responseMessages.USER_NOT_FOUND);
  }

  return user;
};

export const getTokenByUserId = async (userId) => {
  let retrievedToken;
  try {
    retrievedToken = await tokenRepo.getTokenByUserId(userId);
  } catch (err) {
    throw new RepositoryFailure(responseMessages.GET_TOKEN_BY_USER_ID_FAILURE);
  }

  return retrievedToken;
};

export const getTokenByUserIdTokenValue = async (userId, token) => {
  let retrievedToken;
  try {
    retrievedToken = await tokenRepo.getTokenByUserIdTokenValue(userId, token);
  } catch (err) {
    throw new RepositoryFailure(
      responseMessages.GET_TOKEN_BY_USER_ID_TOKEN_VALUE_FAILURE
    );
  }

  return retrievedToken;
};

export const createUser = async (email, username, password) => {
  let emailExists, usernameExists;

  const emailRegExp = new RegExp(regExp.EMAIL);
  if (!email.match(emailRegExp)) {
    throw new FieldValidationFailure(responseMessages.EMAIL_VALIDATION_FAIL);
  }

  const usernameRegExp = new RegExp(regExp.USERNAME);
  if (!username.match(usernameRegExp)) {
    throw new FieldValidationFailure(responseMessages.USERNAME_VALIDATION_FAIL);
  }

  const passwordRegExp = new RegExp(regExp.PASSWORD);
  if (!password.match(passwordRegExp)) {
    throw new FieldValidationFailure(responseMessages.PASSWORD_VALIDATION_FAIL);
  }

  try {
    emailExists = await userRepo.emailExists(email);
  } catch (err) {
    throw new RepositoryFailure(responseMessages.GET_EMAIL_EXISTS_FAILURE);
  }

  try {
    usernameExists = await userRepo.usernameExists(username);
  } catch (err) {
    throw new RepositoryFailure(responseMessages.GET_USER_EXISTS_FAILURE);
  }

  if (emailExists) {
    throw new InformationExists(responseMessages.EMAIL_ALREADY_EXISTS);
  }

  if (usernameExists) {
    throw new InformationExists(responseMessages.USERNAME_ALREADY_EXISTS);
  }

  try {
    const confirmationCode = jsonwebtoken.sign(
      { email: email },
      EMAIL_CONFIRMATION_SECRET
    );
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const createdUser = await userRepo.createUser(
      email,
      username,
      passwordHash,
      confirmationCode
    );

    await sendConfirmationEmail(username, email, confirmationCode);
    return createdUser;
  } catch (err) {
    throw new RepositoryFailure(responseMessages.CREATE_USER_FAILURE);
  }
};

export const updateUserPassword = async (userId, oldPassword, newPassword) => {
  if (oldPassword === newPassword) {
    throw new IdenticalPassword(responseMessages.PASSWORDS_IDENTICAL);
  }

  const passwordRegExp = new RegExp(regExp.PASSWORD);
  if (!newPassword.match(passwordRegExp)) {
    throw new FieldValidationFailure(responseMessages.PASSWORD_VALIDATION_FAIL);
  }

  let user;
  try {
    user = await userRepo.getUserById(userId);
  } catch (err) {
    throw new RepositoryFailure(responseMessages.GET_USER_BY_ID_FAILURE);
  }

  if (!user) {
    throw new UserNotFound(responseMessages.USER_NOT_FOUND);
  }

  const { email, username, passwordHash } = user;
  const passwordMatch = await bcrypt.compare(oldPassword, passwordHash);
  if (!passwordMatch) {
    throw new PasswordNotMatch(responseMessages.PASSWORD_DOES_NOT_MATCH);
  }

  try {
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    const updatedUser = await userRepo.updateUser(
      userId,
      email,
      username,
      passwordHash
    );
    return updatedUser;
  } catch (err) {
    throw new RepositoryFailure(responseMessages.UPDATE_USER_FAILURE);
  }
};

export const deleteUser = async (userId) => {
  try {
    const deletedUser = await userRepo.deleteUser(userId);
    return deletedUser;
  } catch (err) {
    throw new RepositoryFailure(responseMessages.DELETE_USER_FAILURE);
  }
};

export const verifyUser = async (email, password) => {
  let user;
  try {
    user = await userRepo.getUserByEmail(email);
  } catch (err) {
    throw new RepositoryFailure(responseMessages.GET_USER_BY_EMAIL_FAILURE);
  }

  if (!user) {
    throw new UserNotFound(responseMessages.USER_NOT_FOUND);
  }

  if (!user.isEmailVerified) {
    throw new UserNotVerified(responseMessages.USER_NOT_EMAIL_VERIFIED);
  }

  const { passwordHash } = user;
  const passwordMatch = await bcrypt.compare(password, passwordHash);
  return passwordMatch;
};

export const emailVerifyingUser = async (confirmationCode) => {
  let user;
  let confirmedUser;

  try {
    user = await userRepo.getUserByConfirmationCode(confirmationCode);
  } catch (err) {
    throw new RepositoryFailure(
      responseMessages.GET_USER_BY_CONFIRMATION_CODE_FAILURE
    );
  }

  if (!user) {
    throw new UserNotFound(responseMessages.USER_NOT_FOUND);
  }

  if (user.isEmailVerified) {
    throw new UserAlreadyEmailVerified(
      responseMessages.USER_ALREADY_EMAIL_VERIFIED
    );
  }

  try {
    confirmedUser = await userRepo.confirmUser(confirmationCode);
  } catch (err) {
    throw new RepositoryFailure(responseMessages.CONFIRM_USER_FAILURE);
  }
  return confirmedUser;
};

export const createToken = async (userId) => {
  let createdToken;
  try {
    createdToken = await tokenRepo.createToken(userId);
  } catch (err) {
    throw new RepositoryFailure(responseMessages.CREATE_TOKEN_FAILURE);
  }
  return createdToken;
};

export const sendResetPasswordLinkUser = async (email) => {
  let user;
  let token;

  try {
    user = await userRepo.getUserByEmail(email);
  } catch (err) {
    throw new RepositoryFailure(responseMessages.GET_USER_BY_EMAIL_FAILURE);
  }

  if (!user) {
    throw new UserNotFound(responseMessages.USER_NOT_FOUND);
  }

  token = await getTokenByUserId(user.id);

  if (!token) {
    token = await createToken(user.id);
  }

  if (!token) {
    throw new TokenNotFound(responseMessages.TOKEN_NOT_FOUND);
  }

  const passwordResetLink = `${EMAIL_RESET_URI}/${user.id}/${token.token}`;
  await sendResetEmail(user.username, email, passwordResetLink);

  return { user, token };
};

export const resetPasswordUser = async (userId, token, newPassword) => {
  let user;
  let updatedUser;
  let retrievedToken;

  try {
    user = await userRepo.getUserById(userId);
  } catch (err) {
    throw new RepositoryFailure(responseMessages.GET_USER_BY_ID_FAILURE);
  }

  if (!user) {
    throw new UserNotFound(responseMessages.USER_NOT_FOUND);
  }

  retrievedToken = await getTokenByUserIdTokenValue(userId, token);

  if (!retrievedToken) {
    throw new TokenNotFound(responseMessages.TOKEN_NOT_FOUND);
  }

  const passwordRegExp = new RegExp(regExp.PASSWORD);
  if (!newPassword.match(passwordRegExp)) {
    throw new FieldValidationFailure(responseMessages.PASSWORD_VALIDATION_FAIL);
  }

  try {
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    updatedUser = await userRepo.updateUser(
      userId,
      user.email,
      user.username,
      passwordHash
    );
  } catch (err) {
    throw new RepositoryFailure(responseMessages.UPDATE_USER_FAILURE);
  }

  try {
    await tokenRepo.deleteToken(userId);
  } catch (err) {
    throw new RepositoryFailure(responseMessages.DELETE_TOKEN_FAILURE);
  }

  return updatedUser;
};
