import React, { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Field, useFormikContext } from "formik";
import {
  ActionButton,
  Col,
  Input,
  Row,
  Select,
} from "@canonical/react-components";
import * as Sentry from "@sentry/react";
import {
  caProvinces,
  countries,
  USStates,
  vatCountries,
} from "advantage/countries-and-states";
import { getLabel } from "advantage/subscribe/react/utils/utils";
import postCustomerTaxInfo from "../../hooks/postCustomerTaxInfo";
import { CheckoutProducts, FormValues } from "../../utils/types";
import { UserSubscriptionMarketplace } from "advantage/api/enum";
import type { DisplayError } from "../../utils/types";

type TaxesProps = {
  products: CheckoutProducts[];
  setError: React.Dispatch<React.SetStateAction<DisplayError | null>>;
};

const Taxes = ({ products, setError }: TaxesProps) => {
  const {
    values,
    initialValues,
    errors,
    touched,
    setFieldValue,
    setFieldTouched,
    setErrors: setFormikErrors,
  } = useFormikContext<FormValues>();
  const queryClient = useQueryClient();
  const isNewUser = !window.accountId || !initialValues.country;
  const isChannelUser =
    values.marketplace === UserSubscriptionMarketplace.CanonicalProChannel;
  const [isEditing, setIsEditing] = useState(isNewUser || !isChannelUser);
  const postCustomerTaxInfoMutation = postCustomerTaxInfo();
  const hasZeroPriceValue = products.some(
    (item) => item.product.price.value === 0,
  );

  useEffect(() => {
    if (errors.VATNumber) {
      setIsEditing(true);
      setFieldValue("isTaxSaved", false);
    }
  }, [errors]);

  useEffect(() => {
    const savedCountry = !!initialValues.country;

    if (savedCountry) {
      setIsEditing(!savedCountry);
      setFieldValue("isTaxSaved", !!savedCountry);
    }
  }, [initialValues]);

  const onSaveClick = () => {
    setIsEditing(false);
    setFieldTouched("isTaxSaved", false);
    if (!window.accountId) {
      queryClient.invalidateQueries({ queryKey: ["calculate"] });
      setFieldValue("isTaxSaved", true);
    } else {
      postCustomerTaxInfoMutation.mutate(
        {
          formData: values,
        },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["preview"] });
            queryClient.invalidateQueries({ queryKey: ["customerInfo"] });
          },
          onError: (error) => {
            setFieldValue("Description", false);
            setFieldValue("TermsAndConditions", false);
            document.querySelector("h1")?.scrollIntoView();
            Sentry.captureException(error);
            if (error instanceof Error)
              if (error.message.includes("tax_id_invalid")) {
                setFormikErrors({
                  VATNumber:
                    "That VAT number is invalid. Check the number and try again.",
                });
                setError({
                  title: "Invalid VAT number",
                  description: (
                    <>
                      The VAT number entered is invalid: check the number and
                      try again.
                    </>
                  ),
                });
              } else if (error.message.includes("tax_id_cannot_be_validated")) {
                setFormikErrors({
                  VATNumber:
                    "VAT number could not be validated at this time, please try again later or contact customer success if the problem persists.",
                });
                setError({
                  description: (
                    <>
                      VAT number could not be validated at this time, please try
                      again later or contact{" "}
                      <a href="mailto:customersuccess@canonical.com">
                        customer success
                      </a>{" "}
                      if the problem persists.
                    </>
                  ),
                });
              } else {
                setError({ description: <>VAT could not be applied.</> });
              }
          },
        },
      );
      setFieldValue("isTaxSaved", true);
    }
  };

  const onEditClick = () => {
    setIsEditing(true);
    setFieldValue("isTaxSaved", false);
  };

  const validateRequired = (value: string) => {
    let errorMessage;
    if (!value) {
      errorMessage = "This field is required.";
    }
    return errorMessage;
  };

  const validateUSState = (value: string) => {
    let errorMessage;
    if (!value && values.country === "US") {
      errorMessage = "This field is required.";
    }
    return errorMessage;
  };

  const validatecaProvince = (value: string) => {
    let errorMessage;
    if (!value && values.country === "CA") {
      errorMessage = "This field is required.";
    }
    return errorMessage;
  };

  const displayMode = (
    <>
      <Row>
        <Col size={4}>
          <p>Country/Region:</p>
        </Col>
        <Col size={8}>
          <p>
            <strong data-testid="country">
              {getLabel(values.country ?? "", countries)}
            </strong>
          </p>
        </Col>
      </Row>
      {values.country == "US" && values.usState ? (
        <>
          <hr />
          <Row>
            <Col size={4}>
              <p>Your state:</p>
            </Col>
            <Col size={8}>
              <p>
                <strong data-testid="us-state">
                  {getLabel(values.usState, USStates)}
                </strong>
              </p>
            </Col>
          </Row>
        </>
      ) : null}
      {values.country == "CA" && values.caProvince ? (
        <>
          <hr />
          <Row>
            <Col size={4}>
              <p>Your province:</p>
            </Col>
            <Col size={8}>
              <p>
                <strong data-testid="ca-province">
                  {getLabel(values.caProvince, caProvinces)}
                </strong>
              </p>
            </Col>
          </Row>
        </>
      ) : null}
      {vatCountries.includes(values.country ?? "") && !hasZeroPriceValue ? (
        <>
          <hr />
          <Row>
            <Col size={4}>
              <p>VAT number:</p>
            </Col>
            <Col size={8}>
              <p>
                <strong data-testid="vat-number">
                  {values.VATNumber ? values.VATNumber : "None"}
                </strong>
              </p>
            </Col>
          </Row>
        </>
      ) : null}
    </>
  );

  const editMode = (
    <>
      <Field
        data-testid="select-country"
        as={Select}
        id="country"
        name="country"
        options={countries}
        label="Country/Region:"
        stacked
        required
        validate={validateRequired}
        error={touched?.country && errors?.country}
      />
      {values.country === "US" && (
        <Field
          data-testid="select-state"
          as={Select}
          id="usStates"
          name="usState"
          options={USStates}
          label="State:"
          stacked
          required
          validate={validateUSState}
          error={touched?.usState && errors?.usState}
        />
      )}
      {values.country === "CA" && (
        <Field
          data-testid="select-ca-province"
          as={Select}
          id="caProvinces"
          name="caProvince"
          options={caProvinces}
          label="Province:"
          stacked
          required
          validate={validatecaProvince}
          error={touched?.caProvince && errors?.caProvince}
        />
      )}
      {vatCountries.includes(values.country ?? "") && !hasZeroPriceValue && (
        <Field
          data-testid="field-vat-number"
          as={Input}
          type="text"
          id="VATNumber"
          name="VATNumber"
          label="VAT number:"
          stacked
          help="e.g. GB 123 1234 12 123 or GB 123 4567 89 1234"
          error={touched?.VATNumber && errors?.VATNumber}
        />
      )}
    </>
  );

  return (
    <>
      <Row>
        {isEditing ? editMode : displayMode}
        <Col size={4}></Col>
        <Col size={8}>
          <Field
            as={Input}
            type="hidden"
            id="isTaxSaved"
            name="isTaxSaved"
            validate={(value: string) => {
              if (values.country && !value) {
                return "Step needs to be saved.";
              }
              return;
            }}
            required
            error={touched?.isTaxSaved && errors?.isTaxSaved}
          />
        </Col>
        {(!isChannelUser || isNewUser) && (
          <>
            <hr />
            <div
              className="u-align--right"
              style={{ marginTop: "calc(.5rem - 1.5px)" }}
            >
              {isEditing ? (
                <>
                  {window.accountId && !!initialValues.country && (
                    // if both exist, show cancel button, or only show save button
                    <ActionButton
                      onClick={() => {
                        setFieldValue("country", initialValues.country);
                        setFieldValue("usState", initialValues.usState);
                        setFieldValue("caProvince", initialValues.caProvince);
                        setFieldValue("VATNumber", initialValues.VATNumber);
                        setIsEditing(false);
                        setFieldValue("isTaxSaved", true);
                        setFieldTouched("isTaxSaved", false);
                      }}
                    >
                      Cancel
                    </ActionButton>
                  )}
                  <ActionButton
                    onClick={onSaveClick}
                    disabled={
                      !values.country ||
                      (values.country === "US" && !values.usState) ||
                      (values.country === "CA" && !values.caProvince)
                    }
                  >
                    Save
                  </ActionButton>
                </>
              ) : (
                <ActionButton
                  onClick={onEditClick}
                  data-testid="tax-edit-button"
                >
                  Edit
                </ActionButton>
              )}
            </div>
          </>
        )}
      </Row>
    </>
  );
};

export default Taxes;
