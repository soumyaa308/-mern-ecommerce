import { body } from "express-validator";

const nameRegex = /^[A-Za-z\s.'-]+$/;
const phoneRegex = /^(?:\+91)?[6-9]\d{9}$/;
const pincodeRegex = /^[1-9][0-9]{5}$/;

export const addressValidator = [
  body("fullName")
    .trim()
    .notEmpty()
    .withMessage("Full name is required")
    .matches(nameRegex)
    .withMessage("Full name should only contain letters"),

  body("phone")
    .trim()
    .notEmpty()
    .withMessage("Phone number is required")
    .matches(phoneRegex)
    .withMessage("Enter a valid 10-digit Indian mobile number"),

  body("addressLine1").trim().notEmpty().withMessage("Address line 1 is required"),

  body("addressLine2").optional({ checkFalsy: true }).trim(),

  body("city")
    .trim()
    .notEmpty()
    .withMessage("City is required")
    .matches(nameRegex)
    .withMessage("City should only contain letters"),

  body("state")
    .trim()
    .notEmpty()
    .withMessage("State is required")
    .matches(nameRegex)
    .withMessage("State should only contain letters"),

  body("postalCode")
    .trim()
    .notEmpty()
    .withMessage("Postal code is required")
    .matches(pincodeRegex)
    .withMessage("Enter a valid 6-digit Indian PIN code"),

  body("country").trim().notEmpty().withMessage("Country is required"),
];