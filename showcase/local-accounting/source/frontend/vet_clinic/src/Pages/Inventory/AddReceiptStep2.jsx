import { API_BASE_URL } from "../../api/http";
import { useEffect, useMemo, useState } from "react";
import { useReceipt } from "./receiptContextStore";
import { useNavigate } from "react-router-dom";
import styles from "./AddReceiptStep2.module.css";

import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";

import axios from "axios";
import { toast } from "react-toastify";

import {
    FaPlus,
    FaTrash,
    FaSave,
    FaArrowRight,
} from "react-icons/fa";

import useModulePermission from "../../hooks/useModulePermission";



const RECEIPT_API =
    `${API_BASE_URL}/warehousing/api/v2/warehouse_receipts/`;


const WAREHOUSE_API =
    `${API_BASE_URL}/warehousing/api/v2/warehouses/`;


const MATERIAL_API =
    `${API_BASE_URL}/services/api/v2/materials/`;



const SALES_INVOICE_API =
    `${API_BASE_URL}/incomes/api/v2/sell_invoices/`;


const PURCHASE_INVOICE_API =
    `${API_BASE_URL}/costs/api/v2/buy_invoices/`;



const emptyItem = {

    material_id: "",

    material_code: "",

    unit: "",

    qty: "",

    ref: "",

    note: "",

};



export default function AddReceiptStep2() {


    const {
        step1Data
    } = useReceipt();



    const navigate = useNavigate();



    const {
        canWrite,
        disabledReason
    } = useModulePermission(
        "warehousing"
    );




    const [form, setForm] = useState({

        document_number: "",

        date: "",

        description: "",

        delivery: "",

        handover: "",

        items: [
            {
                ...emptyItem
            }
        ],

    });




    const [materials, setMaterials] =
        useState([]);



    const [warehouses, setWarehouses] =
        useState([]);




    const [destWarehouseId, setDestWarehouseId] =
        useState("");



    const [referenceInvoices, setReferenceInvoices] =
        useState([]);



    const [selectedInvoice, setSelectedInvoice] =
        useState("");



    const [submitting, setSubmitting] =
        useState(false);





    const documentType =
        step1Data?.type;




    const isTransfer =
        documentType === "انتقال";



    const isSalesInvoice =
        documentType === "فاکتور فروش";



    const isPurchaseInvoice =
        documentType === "فاکتور خرید";



    const isReferenceDocument =
        !isTransfer;






    useEffect(() => {


        if (!step1Data) {

            navigate(
                "/inventory/transfers"
            );

            return;

        }



        const fetchData = async () => {


            try {


                const requests = [

                    axios.get(
                        WAREHOUSE_API
                    ),

                ];




                if (isTransfer) {

                    requests.push(
                        axios.get(
                            MATERIAL_API
                        )
                    );

                }





                if (
                    isSalesInvoice ||
                    isPurchaseInvoice
                ) {


                    const api =
                        isSalesInvoice
                            ?
                            SALES_INVOICE_API
                            :
                            PURCHASE_INVOICE_API;



                    requests.push(
                        axios.get(api)
                    );

                }






                const results =
                    await Promise.all(
                        requests
                    );



                let index = 0;



                const warehouseRes =
                    results[index++];



                setWarehouses(
                    Array.isArray(
                        warehouseRes.data
                    )
                        ?
                        warehouseRes.data
                        :
                        warehouseRes.data?.results || []
                );





                if (isTransfer) {


                    const materialRes =
                        results[index++];


                    setMaterials(
                        Array.isArray(
                            materialRes.data
                        )
                            ?
                            materialRes.data
                            :
                            materialRes.data?.results || []
                    );


                }





                if (
                    isSalesInvoice ||
                    isPurchaseInvoice
                ) {


                    const invoiceRes =
                        results[index++];


                    const invoiceRows = Array.isArray(invoiceRes.data)
                        ? invoiceRes.data
                        : invoiceRes.data?.results || [];

                    setReferenceInvoices(
                        invoiceRows.filter((invoice) => {
                            const sameWarehouse =
                                String(invoice.warehouse || "") ===
                                String(step1Data.from_warehouse_id || "");
                            const hasNoReceipt = !invoice.warehouse_receipt;
                            const isActive = !invoice.is_reversed;
                            const isDraft = isSalesInvoice
                                ? invoice.invoice_type === "پیش نویس"
                                : (invoice.status || invoice.invoice_type) === "DRAFT";

                            return sameWarehouse && hasNoReceipt && isActive && isDraft;
                        })
                    );


                }



            }

            catch (error) {


                console.error(
                    error
                );


                toast.error(
                    "خطا در دریافت اطلاعات اولیه"
                );


            }


        };



        fetchData();



    }, [
        navigate,
        step1Data,
        isTransfer,
        isSalesInvoice,
        isPurchaseInvoice,
    ]);







    const selectedFromWarehouseName =
        useMemo(() => {


            return (
                step1Data?.from_warehouse_name
                ||
                "—"
            );


        }, [
            step1Data
        ]);






    const guardWrite = () => {


        if (!canWrite) {

            toast.error(
                disabledReason
            );

            return true;

        }


        return false;


    };







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








    const handleItemChange = (
        index,
        field,
        value
    ) => {


        setForm(prev => {


            const updated =
                [
                    ...prev.items
                ];



            updated[index] = {

                ...updated[index],

                [field]: value,

            };





            if (
                field === "material_id"
            ) {


                const selected =
                    materials.find(
                        item =>
                            String(item.id)
                            ===
                            String(value)
                    );



                updated[index].material_code =
                    selected?.sku_code
                    ||
                    selected?.code
                    ||
                    selected?.barcode
                    ||
                    "";



                updated[index].unit =
                    selected?.unit_name
                    ||
                    selected?.unit
                    ||
                    selected?.main_unit
                    ||
                    "";



            }




            return {

                ...prev,

                items: updated,

            };



        });



    };







    const addRow = () => {


        if (
            guardWrite()
        )
            return;



        setForm(prev => ({

            ...prev,

            items: [
                ...prev.items,
                {
                    ...emptyItem
                }
            ]

        }));


    };







    const removeRow = (
        index
    ) => {


        if (
            guardWrite()
        )
            return;



        setForm(prev => ({

            ...prev,


            items:

                prev.items.length === 1

                    ?

                    [
                        {
                            ...emptyItem
                        }
                    ]

                    :

                    prev.items.filter(
                        (_, i) =>
                            i !== index
                    )


        }));


    };




    const validateForm = () => {


        if (
            guardWrite()
        )
            return false;



        if (!form.document_number || Number(form.document_number) <= 0) {
            toast.error("شماره سند معتبر الزامی است");
            return false;
        }

        if (!form.date) {
            toast.error("تاریخ سند الزامی است");
            return false;
        }

        if (
            isReferenceDocument
            &&
            !selectedInvoice
        ) {

            toast.error(
                "انتخاب فاکتور مرجع الزامی است"
            );


            return false;

        }





        if (
            isTransfer
        ) {


            if (
                !destWarehouseId
            ) {

                toast.error(
                    "انتخاب انبار مقصد الزامی است"
                );


                return false;

            }





            if (
                String(
                    step1Data.from_warehouse_id
                )
                ===
                String(
                    destWarehouseId
                )
            ) {


                toast.error(
                    "انبار مبدا و مقصد نمی‌توانند یکی باشند"
                );


                return false;

            }




            const validItems =
                form.items.filter(
                    item =>
                        item.material_id
                        &&
                        Number(item.qty) > 0
                );




            if (
                validItems.length === 0
            ) {

                toast.error(
                    "حداقل یک کالا وارد کنید"
                );


                return false;

            }



        }



        return true;


    };








    const handleSubmit = async () => {


        if (
            !validateForm()
        )
            return;




        try {


            setSubmitting(true);




            const payload = {


                number:
                    form.document_number
                    ||
                    null,



                date:
                    form.date
                    ||
                    null,



                description:
                    form.description
                    ||
                    "",



                transport:
                    form.delivery
                    ||
                    "",

                handover:
                    form.handover
                    ||
                    "",


                type:
                    documentType,




                from_warehouse:
                    Number(
                        step1Data.from_warehouse_id
                    ),



                items:


                    isTransfer


                        ?


                        form.items

                            .filter(
                                item =>
                                    item.material_id
                                    &&
                                    Number(item.qty) > 0
                            )

                            .map(
                                item => ({

                                    material:
                                        Number(
                                            item.material_id
                                        ),


                                    quantity:
                                        Number(
                                            item.qty
                                        ),



                                    reference:
                                        item.ref
                                        ||
                                        "",



                                    description:
                                        item.note
                                        ||
                                        "",


                                })

                            )


                        :



                        [],






                sales_invoice:

                    isSalesInvoice

                        ?

                        Number(
                            selectedInvoice
                        )

                        :

                        null,





                buy_invoice:

                    isPurchaseInvoice

                        ?

                        Number(
                            selectedInvoice
                        )

                        :

                        null,





            };






            if (
                isTransfer
            ) {


                payload.destination_warehouse =
                    Number(
                        destWarehouseId
                    );


            }







            await axios.post(
                RECEIPT_API,
                payload
            );






            toast.success(
                "رسید/حواله با موفقیت ثبت شد"
            );



            navigate(
                "/inventory/transfers"
            );



        }



        catch (error) {



            console.error(
                error
            );



            toast.error(
                error?.response?.data?.error
                ||
                error?.response?.data?.detail
                ||
                "خطا در ثبت سند"
            );



        }



        finally {


            setSubmitting(false);


        }



    };






    if (
        !step1Data
    )
        return null;







    return (
        <div className={styles.pageContainer}>
            <div className={styles.card}>
                <div className={styles.header}>
                    <div>
                        <h3>ثبت رسید / حواله انبار</h3>
                        <p>{documentType}</p>
                    </div>
                    <button
                        type="button"
                        className={styles.backBtn}
                        onClick={() => navigate(-1)}
                    >
                        <FaArrowRight />
                        برگشت
                    </button>
                </div>

                <div className={styles.summaryGrid}>
                    <div>
                        <span>نوع سند</span>
                        <strong>{documentType || "—"}</strong>
                    </div>
                    <div>
                        <span>{isPurchaseInvoice ? "انبار مقصد" : "انبار مبدا"}</span>
                        <strong>{selectedFromWarehouseName}</strong>
                    </div>
                    <div>
                        <span>وضعیت ثبت</span>
                        <strong>{isTransfer ? "پیش‌نویس تا زمان تأیید انتقال" : "ثبت مستقیم اثر انبار"}</strong>
                    </div>
                </div>

                <div className={styles.formGrid}>
                    <div className={styles.formField}>
                        <label>شماره سند *</label>
                        <input
                            type="number"
                            name="document_number"
                            min="1"
                            value={form.document_number}
                            onChange={handleChange}
                            placeholder="شماره رسید / حواله"
                        />
                    </div>

                    <div className={styles.formField}>
                        <label>تاریخ *</label>
                        <DatePicker
                            calendar={persian}
                            locale={persian_fa}
                            value={form.date}
                            onChange={(dateObj) =>
                                setForm((prev) => ({
                                    ...prev,
                                    date: dateObj ? dateObj.format("YYYY/MM/DD") : "",
                                }))
                            }
                            format="YYYY/MM/DD"
                            inputClass={styles.dateInput}
                            calendarPosition="bottom-right"
                        />
                    </div>

                    {isTransfer && (
                        <div className={styles.formField}>
                            <label>انبار مقصد *</label>
                            <select
                                value={destWarehouseId}
                                onChange={(e) => setDestWarehouseId(e.target.value)}
                            >
                                <option value="">انتخاب کنید</option>
                                {warehouses
                                    .filter((w) => String(w.id) !== String(step1Data.from_warehouse_id))
                                    .map((w) => (
                                        <option key={w.id} value={w.id}>{w.name}</option>
                                    ))}
                            </select>
                        </div>
                    )}

                    {isReferenceDocument && (
                        <div className={styles.formField}>
                            <label>فاکتور مرجع *</label>
                            <select
                                value={selectedInvoice}
                                onChange={(e) => setSelectedInvoice(e.target.value)}
                            >
                                <option value="">انتخاب فاکتور</option>
                                {referenceInvoices.map((invoice) => (
                                    <option key={invoice.id} value={invoice.id}>
                                        {invoice.code ? `#${invoice.code}` : `#${invoice.id}`}
                                        {invoice.reference ? ` - ${invoice.reference}` : ""}
                                        {invoice.title ? ` - ${invoice.title}` : ""}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className={styles.formField}>
                        <label>حمل و نقل</label>
                        <input
                            name="delivery"
                            value={form.delivery}
                            onChange={handleChange}
                            placeholder="روش ارسال / نام راننده"
                        />
                    </div>

                    <div className={styles.formField}>
                        <label>تحویل‌دهنده / تحویل‌گیرنده</label>
                        <input
                            name="handover"
                            value={form.handover}
                            onChange={handleChange}
                            placeholder="نام شخص"
                        />
                    </div>

                    <div className={`${styles.formField} ${styles.fullWidth}`}>
                        <label>توضیحات</label>
                        <textarea
                            name="description"
                            value={form.description}
                            onChange={handleChange}
                            placeholder="توضیحات سند"
                        />
                    </div>
                </div>

                {isReferenceDocument && referenceInvoices.length === 0 && (
                    <div className={styles.summaryGrid}>
                        <div className={styles.fullWidth}>
                            <span>فاکتور قابل انتخاب</span>
                            <strong>
                                برای این انبار فاکتور پیش‌نویسِ بدون رسید انبار وجود ندارد.
                            </strong>
                        </div>
                    </div>
                )}

                {isTransfer && (
                    <>
                        <div className={styles.itemsHeader}>
                            <div>
                                <h4>اقلام انتقال</h4>
                                <p>کالا و تعداد انتقال بین دو انبار را ثبت کن.</p>
                            </div>
                            <button
                                type="button"
                                className={styles.addRowBtn}
                                onClick={addRow}
                                disabled={!canWrite}
                                title={!canWrite ? disabledReason : undefined}
                            >
                                <FaPlus />
                                افزودن ردیف
                            </button>
                        </div>

                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>ردیف</th>
                                        <th>کالا</th>
                                        <th>کد کالا</th>
                                        <th>واحد</th>
                                        <th>تعداد</th>
                                        <th>ارجاع</th>
                                        <th>توضیح</th>
                                        <th>حذف</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {form.items.map((item, index) => (
                                        <tr key={index}>
                                            <td>{index + 1}</td>
                                            <td>
                                                <select
                                                    value={item.material_id}
                                                    onChange={(e) => handleItemChange(index, "material_id", e.target.value)}
                                                >
                                                    <option value="">انتخاب کالا</option>
                                                    {materials.map((m) => (
                                                        <option key={m.id} value={m.id}>
                                                            {m.persian_name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td>{item.material_code || "—"}</td>
                                            <td>{item.unit || "—"}</td>
                                            <td>
                                                <input
                                                    type="number"
                                                    min="0.001"
                                                    step="0.001"
                                                    value={item.qty}
                                                    onChange={(e) => handleItemChange(index, "qty", e.target.value)}
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    value={item.ref}
                                                    onChange={(e) => handleItemChange(index, "ref", e.target.value)}
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    value={item.note}
                                                    onChange={(e) => handleItemChange(index, "note", e.target.value)}
                                                />
                                            </td>
                                            <td>
                                                <button
                                                    type="button"
                                                    className={styles.deleteBtn}
                                                    onClick={() => removeRow(index)}
                                                    disabled={!canWrite}
                                                    title={!canWrite ? disabledReason : "حذف ردیف"}
                                                >
                                                    <FaTrash />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                <div className={styles.footer}>
                    <button
                        type="button"
                        className={styles.cancelBtn}
                        onClick={() => navigate(-1)}
                        disabled={submitting}
                    >
                        انصراف
                    </button>
                    <button
                        type="button"
                        className={styles.submitBtn}
                        onClick={handleSubmit}
                        disabled={submitting || !canWrite || (isReferenceDocument && referenceInvoices.length === 0)}
                        title={!canWrite ? disabledReason : undefined}
                    >
                        <FaSave />
                        {submitting ? "در حال ثبت..." : "ثبت سند"}
                    </button>
                </div>
            </div>
        </div>
    );
}
