module.exports = {
  success: (res, message = "OK", data = {}, status = 200) => {
    return res.status(status).json({
      success: true,
      message,
      ...(Object.keys(data).length > 0 ? { data } : {}),
    });
  },

  error: (res, errorCode = "unknown_error", message = "An error occurred", status = 400, extra = {}) => {
    return res.status(status).json({
      success: false,
      error: errorCode,
      message,
      ...extra,
    });
  },
};
