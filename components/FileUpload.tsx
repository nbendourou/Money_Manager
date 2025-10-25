import React, { useState, useCallback, useEffect } from 'react';
import * as XLSX from 'xlsx';
import type { Transaction, BudgetData } from '../types';
import { UploadCloud, CheckCircle, AlertCircle } from 'lucide-react';

interface FileUploadProps {
    onDataLoaded: (data: { transactions: Transaction[], budget: BudgetData }) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onDataLoaded }) => {
    const [transactions, setTransactions] = useState<Transaction[] | null>(null);
    const [budget, setBudget] = useState<BudgetData | null>(null);
    const [transactionFile, setTransactionFile] = useState<File | null>(null);
    const [budgetFile, setBudgetFile] = useState<File | null>(null);
    const [transactionError, setTransactionError] = useState<string | null>(null);
    const [budgetError, setBudgetError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState<boolean>(false);

    useEffect(() => {
        if (transactions && budget) {
            onDataLoaded({ transactions, budget });
            setIsProcessing(false);
        }
    }, [transactions, budget, onDataLoaded]);

    const processTransactions = useCallback((file: File) => {
        setTransactionFile(file);
        setTransactionError(null);
        setIsProcessing(true);
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                const json: any[] = XLSX.utils.sheet_to_json(worksheet);

                const requiredCols = ['Date', 'Compte', 'Catégorie', 'MAD', 'Revenu/dépense'];
                const missingCols = requiredCols.filter(col => !Object.keys(json[0] || {}).includes(col));
                if (missingCols.length > 0) throw new Error(`Colonnes manquantes: ${missingCols.join(', ')}`);

                const parsedTransactions: Transaction[] = json.map((row, index) => {
                    if (!row.Date || row.MAD === undefined || !row['Revenu/dépense'] || !row.Compte || !row['Catégorie']) {
                       throw new Error(`Ligne ${index + 2} invalide : données manquantes.`);
                    }
                    const description = [row['Catégorie'], row['Sous-catégories'], row['Note']].filter(Boolean).join(' - ');
                    const amount = Math.abs(Number(row.MAD));
                    if (isNaN(amount)) throw new Error(`Montant invalide à la ligne ${index + 2}.`);
                    const rawType = String(row['Revenu/dépense']).trim();
                    return {
                        date: new Date(row.Date),
                        description: description || 'Non décrit',
                        amount,
                        type: rawType === 'Revenu' ? 'Revenu' : rawType === 'Sorties' ? 'Sorties' : 'Dépense',
                        account: String(row.Compte)
                    };
                });
                setTransactions(parsedTransactions);
            } catch (err: any) {
                setTransactionError(`Erreur: ${err.message}`);
                setTransactionFile(null); // Reset on error
                setIsProcessing(false);
            }
        };
        reader.onerror = () => { setTransactionError("Impossible de lire le fichier."); setIsProcessing(false); };
        reader.readAsBinaryString(file);
    }, []);

    const processBudget = useCallback((file: File) => {
        setBudgetFile(file);
        setBudgetError(null);
        setIsProcessing(true);
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                const json: any[] = XLSX.utils.sheet_to_json(worksheet);
                
                if (json.length === 0) throw new Error("Le fichier budget est vide.");

                const headers = Object.keys(json[0]);
                const categoryHeader = headers.find(h => h.toLowerCase().includes('catégorie'));
                const budgetHeader = headers.find(h => h.toLowerCase().includes('budget'));
                
                if (!categoryHeader || !budgetHeader) {
                    throw new Error("Le fichier budget doit contenir les colonnes 'Catégorie' et 'Budget'.");
                }

                const parsedBudget: BudgetData = json.reduce((acc, row) => {
                    const category = row[categoryHeader];
                    const amount = Number(row[budgetHeader]);
                    if (category && !isNaN(amount)) {
                        acc[String(category).trim()] = amount;
                    }
                    return acc;
                }, {});
                setBudget(parsedBudget);
            } catch (err: any) {
                setBudgetError(`Erreur: ${err.message}`);
                setBudgetFile(null); // Reset on error
                setIsProcessing(false);
            }
        };
        reader.onerror = () => { setBudgetError("Impossible de lire le fichier."); setIsProcessing(false); };
        reader.readAsBinaryString(file);
    }, []);

    const FileInputBox = ({ title, description, onFileSelected, file, error }: { title: string, description: string, onFileSelected: (file: File) => void, file: File | null, error: string | null }) => {
        const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
            if (event.target.files?.[0]) onFileSelected(event.target.files[0]);
        };
        const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
            event.preventDefault(); event.stopPropagation();
            if (event.dataTransfer.files?.[0]) onFileSelected(event.dataTransfer.files[0]);
        }, [onFileSelected]);
        const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); };

        const inputId = `file-input-${title.replace(/\s+/g, '-')}`;
        const isUploaded = file !== null;
        const borderColor = error ? 'border-red-500' : isUploaded ? 'border-green-500' : 'border-gray-600 hover:border-cyan-400';
        const Icon = error ? AlertCircle : isUploaded ? CheckCircle : UploadCloud;
        const iconColor = error ? 'text-red-500' : isUploaded ? 'text-green-500' : 'text-cyan-400';

        return (
            <div className="w-full">
                <div 
                    className={`border-2 border-dashed rounded-xl p-6 text-center bg-gray-800 transition-all duration-300 cursor-pointer ${borderColor}`}
                    onDrop={handleDrop} onDragOver={handleDragOver} onClick={() => document.getElementById(inputId)?.click()}
                >
                    <input type="file" id={inputId} className="hidden" accept=".xlsx" onChange={handleFileChange} disabled={isUploaded || isProcessing} />
                    <div className="flex flex-col items-center justify-center space-y-3">
                        <Icon className={`w-12 h-12 ${iconColor}`} />
                        <p className="text-lg font-semibold">{title}</p>
                        {isUploaded ? (
                           <p className="text-gray-400 truncate max-w-full px-2">{file.name}</p>
                        ) : (
                           <p className="text-sm text-gray-500">{description}</p>
                        )}
                    </div>
                </div>
                {error && <p className="mt-2 text-red-400 text-center text-sm">{error}</p>}
            </div>
        );
    };

    return (
        <div className="w-full max-w-4xl mx-auto">
            <div className="space-y-6 md:space-y-0 md:flex md:gap-8">
                <FileInputBox 
                    title="Fichier des Transactions" 
                    description="Glissez-déposez ou cliquez ici (.xlsx)" 
                    onFileSelected={processTransactions} 
                    file={transactionFile} 
                    error={transactionError} 
                />
                <FileInputBox 
                    title="Fichier Budget Annuel" 
                    description="Doit contenir 'Catégorie' & 'Budget'"
                    onFileSelected={processBudget} 
                    file={budgetFile} 
                    error={budgetError} 
                />
            </div>
            {isProcessing && !transactions && !budget && <p className="mt-6 text-center text-cyan-400">Traitement des fichiers...</p>}
        </div>
    );
};

export default FileUpload;