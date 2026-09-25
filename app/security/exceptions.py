class AuthenticationError(Exception):
    """Credentials or an access token could not be verified."""


class AuthorizationError(Exception):
    """The authenticated user does not have the required role."""


class JWTConfigurationError(Exception):
    """JWT signing is unavailable until secure settings are provided."""
