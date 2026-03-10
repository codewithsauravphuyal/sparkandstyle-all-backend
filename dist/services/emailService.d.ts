export declare const sendEmail: (options: {
    to: string;
    subject: string;
    html: string;
    text?: string;
}) => Promise<import("nodemailer/lib/smtp-transport").SentMessageInfo>;
export declare const emailTemplates: {
    orderConfirmation: (orderData: any) => {
        subject: string;
        html: string;
    };
    orderShipped: (orderData: any) => {
        subject: string;
        html: string;
    };
    orderDelivered: (orderData: any) => {
        subject: string;
        html: string;
    };
    newOrderAdmin: (orderData: any) => {
        subject: string;
        html: string;
    };
    passwordReset: (resetData: any) => {
        subject: string;
        html: string;
    };
};
//# sourceMappingURL=emailService.d.ts.map