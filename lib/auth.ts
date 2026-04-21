import {
  AdminConfirmSignUpCommand,
  ChangePasswordCommand,
  CognitoIdentityProviderClient,
  GetUserCommand,
  InitiateAuthCommand,
  SignUpCommand
} from "@aws-sdk/client-cognito-identity-provider";
import { CognitoJwtVerifier } from "aws-jwt-verify";
import { cookies } from "next/headers";
import { readCognitoEnv } from "@/lib/env";

export const AUTH_COOKIE = "astralchat_access_token";

function client() {
  const env = readCognitoEnv();
  return new CognitoIdentityProviderClient({ region: env.awsRegion });
}

export async function signUp(email: string, password: string) {
  const env = readCognitoEnv();
  const result = await client().send(
    new SignUpCommand({
      ClientId: env.cognitoClientId,
      Username: email,
      Password: password,
      UserAttributes: [{ Name: "email", Value: email }]
    })
  );
  return { userSub: result.UserSub };
}

export async function adminConfirmSignUp(email: string) {
  const env = readCognitoEnv();
  await client().send(
    new AdminConfirmSignUpCommand({
      UserPoolId: env.cognitoUserPoolId,
      Username: email
    })
  );
}

export async function signIn(email: string, password: string) {
  const env = readCognitoEnv();
  const output = await client().send(
    new InitiateAuthCommand({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: env.cognitoClientId,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password
      }
    })
  );

  const accessToken = output.AuthenticationResult?.AccessToken;
  if (!accessToken) {
    throw new Error("Sign-in failed. No access token returned.");
  }
  return accessToken;
}

export async function getAuthenticatedUserId() {
  const env = readCognitoEnv();
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  if (!token) {
    return null;
  }

  const verifier = CognitoJwtVerifier.create({
    userPoolId: env.cognitoUserPoolId,
    tokenUse: "access",
    clientId: env.cognitoClientId
  });

  try {
    const payload = await verifier.verify(token);
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

export async function getAccessToken(): Promise<string | null> {
  return (await cookies()).get(AUTH_COOKIE)?.value ?? null;
}

export async function getUserEmail(accessToken: string): Promise<string | null> {
  const result = await client().send(
    new GetUserCommand({ AccessToken: accessToken })
  );
  return (
    result.UserAttributes?.find((a) => a.Name === "email")?.Value ?? null
  );
}

export async function changePassword(
  accessToken: string,
  previousPassword: string,
  proposedPassword: string
) {
  await client().send(
    new ChangePasswordCommand({
      AccessToken: accessToken,
      PreviousPassword: previousPassword,
      ProposedPassword: proposedPassword
    })
  );
}
