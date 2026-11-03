import { API_BASE_URL } from "../../api/http";
import { useEffect, useMemo, useState } from "react";
import styles from "./AddReceiptStep1.module.css";
import { FaTimes } from "react-icons/fa";
import axios from "axios";
import { toast } from "react-toastify";
import { useReceipt } from "./receiptContextStore";
import { useNavigate } from "react-router-dom";


const WAREHOUSE_API =
    `${API_BASE_URL}/warehousing/api/v2/warehouses/`;


const DOCUMENT_TYPES = [
    {
        value: "انتقال",
        label: "انتقال بین انبارها",
    },
    {
        value: "فاکتور فروش",
        label: "فاکتور فروش",
    },
    {
        value: "فاکتور خرید",
        label: "فاکتور خرید",
    },
    {
        value: "فاکتور برگشت از فروش",
        label: "فاکتور برگشت از فروش",
    },
    {
        value: "فاکتور برگشت از خرید",
        label: "فاکتور برگشت از خرید",
    },
    {
        value: "فاکتور ضایعات",
        label: "فاکتور ضایعات",
    },
];


export default function AddReceiptStep1({
    onClose,
    canWrite = true,
    disabledReason =
    "نقش کاربری شما اجازه انجام این عملیات را ندارد.",
}) {

    const {
        setStep1Data
    } = useReceipt();


    const navigate = useNavigate();


    const [warehouses, setWarehouses] =
        useState([]);


    const [form, setForm] = useState({

        direction: "",

        document_type: "",


        from_warehouse: "",

        destination_warehouse: "",


        sale_invoice_id: "",

        buy_invoice_id: "",


        return_invoice_id: "",

        waste_invoice_id: "",


        reference: "",

    });



    useEffect(() => {

        axios
            .get(WAREHOUSE_API)
            .then((res) => {

                const data =
                    Array.isArray(res.data)
                        ? res.data
                        : res.data.results || [];


                setWarehouses(data);

            })
            .catch(() => {

                toast.error(
                    "خطا در دریافت لیست انبارها"
                );

            });


    }, []);




    const referenceLabel = useMemo(() => {


        switch (form.document_type) {

            case "فاکتور فروش":
                return "شماره فاکتور فروش";


            case "فاکتور خرید":
                return "شماره فاکتور خرید";


            case "فاکتور برگشت از فروش":
                return "شماره برگشت از فروش";


            case "فاکتور برگشت از خرید":
                return "شماره برگشت از خرید";


            case "فاکتور ضایعات":
                return "شماره فاکتور ضایعات";


            default:
                return "";

        }


    }, [
        form.document_type
    ]);




    const handleChange = (e) => {

        const {
            name,
            value
        } = e.target;


        setForm(prev => ({
            ...prev,
            [name]: value,
        }));

    };




    const handleDocumentTypeChange = (
        value
    ) => {


        setForm(prev => ({

            ...prev,

            document_type: value,


            sale_invoice_id: "",

            buy_invoice_id: "",

            return_invoice_id: "",

            waste_invoice_id: "",

            reference: "",


            destination_warehouse:
                value === "انتقال"
                    ? prev.destination_warehouse
                    : "",


        }));



    };




    const validateForm = () => {


        if (!form.document_type) {

            toast.error(
                "انتخاب نوع سند الزامی است"
            );

            return false;

        }



        if (!form.from_warehouse) {

            toast.error(
                "انتخاب انبار مبدا الزامی است"
            );

            return false;

        }




        if (
            form.document_type === "انتقال"
        ) {


            if (
                !form.destination_warehouse
            ) {

                toast.error(
                    "انتخاب انبار مقصد الزامی است"
                );

                return false;

            }



            if (
                String(
                    form.from_warehouse
                )
                ===
                String(
                    form.destination_warehouse
                )
            ) {


                toast.error(
                    "انبار مبدا و مقصد نمی‌تواند یکی باشد"
                );


                return false;

            }


        }




        if (

            form.document_type === "فاکتور فروش"

            &&

            !form.sale_invoice_id

        ) {

            toast.error(
                "شماره فاکتور فروش را وارد کنید"
            );

            return false;

        }




        if (

            form.document_type === "فاکتور خرید"

            &&

            !form.buy_invoice_id

        ) {

            toast.error(
                "شماره فاکتور خرید را وارد کنید"
            );

            return false;

        }



        return true;


    };





    const handleNext = () => {


        if (!canWrite) {

            toast.error(
                disabledReason
            );

            return;

        }



        if (!validateForm()) {

            return;

        }




        const fromWh =
            warehouses.find(
                (w) =>
                    String(w.id)
                    ===
                    String(form.from_warehouse)
            );




        const destinationWh =
            warehouses.find(
                (w) =>
                    String(w.id)
                    ===
                    String(form.destination_warehouse)
            );




        setStep1Data({

            ...form,


            type:
                form.document_type,


            from_warehouse_id:
                form.from_warehouse,


            from_warehouse_name:
                fromWh?.name || "",



            destination_warehouse_id:
                form.destination_warehouse,


            destination_warehouse_name:
                destinationWh?.name || "",


        });




        onClose?.();


        navigate(
            "/inventory/transfers/new/details"
        );


    };






    return (

        <div
            className={styles.modalOverlay}
            onClick={onClose}
        >


            <div

                className={styles.modalContent}

                onClick={(e) =>
                    e.stopPropagation()
                }

            >



                <div className={styles.modalHeader}>


                    <div>

                        <h3>
                            اطلاعات اولیه رسید / حواله
                        </h3>


                        <p>
                            نوع سند، انبارها و اطلاعات مرجع را مشخص کن.
                        </p>


                    </div>



                    <button

                        type="button"

                        className={
                            styles.closeButton
                        }

                        onClick={onClose}

                    >

                        <FaTimes />

                    </button>



                </div>

                <div className={styles.stepper} aria-label="مراحل ثبت سند انبار">
                    <div className={`${styles.step} ${styles.stepActive}`}><span>۱</span><div><strong>نوع و مرجع</strong><small>اطلاعات اولیه سند</small></div></div>
                    <div className={styles.stepLine} />
                    <div className={styles.step}><span>۲</span><div><strong>جزئیات و اقلام</strong><small>ثبت اطلاعات سند</small></div></div>
                    <div className={styles.stepLine} />
                    <div className={styles.step}><span>۳</span><div><strong>ثبت نهایی</strong><small>کنترل و ذخیره</small></div></div>
                </div>

                <div className={styles.form}>


                    <div className={styles.formRow}>

                        <label>
                            نوع سند
                        </label>


                        <select

                            value={
                                form.document_type
                            }

                            onChange={(e) =>
                                handleDocumentTypeChange(
                                    e.target.value
                                )
                            }

                        >

                            <option value="">
                                انتخاب کنید
                            </option>


                            {
                                DOCUMENT_TYPES.map(
                                    item =>
                                    (
                                        <option

                                            key={
                                                item.value
                                            }

                                            value={
                                                item.value
                                            }

                                        >

                                            {
                                                item.label
                                            }


                                        </option>
                                    )
                                )
                            }


                        </select>


                    </div>





                    <div className={styles.formRow}>


                        <label>
                            انبار مبدا
                        </label>



                        <select

                            name="from_warehouse"

                            value={
                                form.from_warehouse
                            }

                            onChange={
                                handleChange
                            }

                        >

                            <option value="">
                                انتخاب کنید
                            </option>


                            {
                                warehouses.map(
                                    w =>
                                    (
                                        <option

                                            key={
                                                w.id
                                            }

                                            value={
                                                w.id
                                            }

                                        >

                                            {
                                                w.name
                                            }


                                        </option>
                                    )
                                )
                            }


                        </select>


                    </div>






                    {
                        form.document_type === "انتقال"
                        &&
                        (

                            <div className={styles.formRow}>


                                <label>
                                    انبار مقصد
                                </label>



                                <select

                                    name="destination_warehouse"

                                    value={
                                        form.destination_warehouse
                                    }

                                    onChange={
                                        handleChange
                                    }

                                >

                                    <option value="">
                                        انتخاب کنید
                                    </option>


                                    {
                                        warehouses.map(
                                            w =>
                                            (
                                                <option

                                                    key={
                                                        w.id
                                                    }

                                                    value={
                                                        w.id
                                                    }

                                                >

                                                    {
                                                        w.name
                                                    }


                                                </option>
                                            )
                                        )
                                    }


                                </select>


                            </div>

                        )
                    }





                    {
                        referenceLabel
                        &&
                        (

                            <div className={styles.formRow}>


                                <label>
                                    {
                                        referenceLabel
                                    }
                                </label>



                                <input

                                    name="reference"

                                    value={
                                        form.reference
                                    }

                                    onChange={
                                        handleChange
                                    }

                                    placeholder="شماره مرجع"

                                />


                            </div>


                        )
                    }






                    {
                        form.document_type === "انتقال"
                        &&
                        (

                            <div className={styles.infoBox}>

                                در مرحله بعد کالاهای انتقال و مقدار آنها مشخص می‌شود.

                            </div>

                        )
                    }




                </div>






                <div className={styles.modalFooter}>


                    <button

                        type="button"

                        className={
                            styles.cancelBtn
                        }

                        onClick={onClose}

                    >

                        انصراف

                    </button>





                    <button

                        type="button"

                        className={
                            styles.nextBtn
                        }

                        onClick={handleNext}

                        disabled={
                            !canWrite
                        }


                        title={
                            !canWrite
                                ? disabledReason
                                : undefined
                        }

                    >

                        ادامه

                    </button>



                </div>



            </div>


        </div>


    );


}